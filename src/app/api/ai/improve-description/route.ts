import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

export const runtime = "nodejs";

const responseSchema = z.object({
  suggestions: z.array(z.string().min(1).max(200)).min(1).max(5),
});

/** Current Gemini Flash models (1.5 retired). Override with GEMINI_MODEL. */
const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

function geminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function geminiModels(): string[] {
  const override = process.env.GEMINI_MODEL?.trim();
  if (override) return [override];
  return [...DEFAULT_GEMINI_MODELS];
}

function isAiConfigured(): boolean {
  return Boolean(geminiApiKey());
}

function googleProvider() {
  return createGoogleGenerativeAI({ apiKey: geminiApiKey()! });
}

function extractErrorText(err: unknown): string {
  if (!err || typeof err !== "object") return "";

  const error = err as {
    message?: string;
    lastError?: { message?: string };
    errors?: Array<{ message?: string }>;
    cause?: { message?: string };
  };

  return (
    error.lastError?.message ??
    error.errors?.at(-1)?.message ??
    error.cause?.message ??
    error.message ??
    ""
  );
}

function isUnavailableError(err: unknown): boolean {
  const raw = extractErrorText(err);
  return (
    raw.includes("503") ||
    raw.includes("UNAVAILABLE") ||
    raw.includes("high demand") ||
    raw.includes("overloaded")
  );
}

function isModelNotFoundError(err: unknown): boolean {
  const raw = extractErrorText(err);
  return (
    raw.includes("404") ||
    raw.includes("NOT_FOUND") ||
    raw.includes("is not found") ||
    raw.includes("not supported for generateContent")
  );
}

function shouldTryNextModel(err: unknown, hasMore: boolean): boolean {
  if (!hasMore) return false;
  return (
    isQuotaError(err) ||
    isUnavailableError(err) ||
    hasZeroFreeQuota(err) ||
    isModelNotFoundError(err)
  );
}

function isQuotaError(err: unknown): boolean {
  const raw = extractErrorText(err);
  return (
    raw.includes("429") ||
    raw.includes("quota") ||
    raw.includes("RESOURCE_EXHAUSTED") ||
    raw.includes("rate limit")
  );
}

function hasZeroFreeQuota(err: unknown): boolean {
  return extractErrorText(err).includes("limit: 0");
}

function parseRetrySeconds(err: unknown): number | null {
  const match = extractErrorText(err).match(/retry in (\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(Number(match[1])) : null;
}

function aiErrorMessage(err: unknown): { message: string; status: number } {
  const fallback = {
    message: "Could not generate suggestions. Try again.",
    status: 500,
  };

  const raw = extractErrorText(err);
  if (!raw) return fallback;

  if (hasZeroFreeQuota(err)) {
    return {
      message:
        "Gemini free tier isn't available for this key or model. In Google AI Studio, check your quota, try a newer Flash model, or enable billing (stays free within limits).",
      status: 402,
    };
  }

  if (isQuotaError(err)) {
    const retrySec = parseRetrySeconds(err);
    return {
      message: retrySec
        ? `Gemini rate limit reached. Try again in about ${retrySec} seconds.`
        : "Gemini rate limit reached. Wait a minute and try again.",
      status: 429,
    };
  }

  if (isUnavailableError(err)) {
    return {
      message:
        "Gemini is busy right now (high demand on the free tier). Wait a moment and try again.",
      status: 503,
    };
  }

  if (isModelNotFoundError(err)) {
    return {
      message:
        "That Gemini model is unavailable. Remove GEMINI_MODEL from env or use gemini-2.5-flash.",
      status: 404,
    };
  }

  if (raw.includes("API key") || raw.includes("API_KEY_INVALID")) {
    return {
      message: "Invalid Gemini API key. Check GEMINI_API_KEY in your environment.",
      status: 403,
    };
  }

  if (raw.length > 0 && raw.length < 280) {
    return { message: raw, status: 500 };
  }

  return fallback;
}

const DESCRIPTION_PROMPT = (
  context: string,
  description: string
) => `You help a freelancer write clear, professional time-entry descriptions for invoicing and reporting.

${context ? `Context:\n${context}\n` : ""}
Current description: ${description || "(empty — suggest useful starters)"}

Return exactly 3 improved description options. Each should be:
- Specific and actionable (what was done, not vague)
- Concise (under 80 characters when possible)
- Professional tone suitable for client-facing timesheets
- Distinct from each other (different angles or levels of detail)

Do not include quotes, bullet prefixes, or numbering in the strings.`;

async function generateSuggestions(
  context: string,
  description: string
): Promise<string[]> {
  const google = googleProvider();
  const models = geminiModels();
  const errors: unknown[] = [];

  for (let i = 0; i < models.length; i++) {
    const modelId = models[i]!;
    try {
      const { object } = await generateObject({
        model: google(modelId),
        schema: responseSchema,
        prompt: DESCRIPTION_PROMPT(context, description),
        maxRetries: 0,
      });
      return object.suggestions;
    } catch (err) {
      errors.push(err);
      if (shouldTryNextModel(err, i < models.length - 1)) {
        console.warn(`improve-description: ${modelId} failed, trying next model`);
        continue;
      }
      throw pickBestError(errors);
    }
  }

  throw pickBestError(errors);
}

/** Prefer user-actionable errors (busy / quota) over model-not-found from fallbacks. */
function pickBestError(errors: unknown[]): unknown {
  for (const err of errors) {
    if (isUnavailableError(err) || isQuotaError(err) || hasZeroFreeQuota(err)) {
      return err;
    }
  }
  return errors.at(-1) ?? new Error("No Gemini models configured.");
}

export async function GET() {
  return Response.json({
    enabled: isAiConfigured(),
    models: geminiModels(),
  });
}

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return Response.json(
      {
        error:
          "AI is not configured. Add GEMINI_API_KEY from Google AI Studio.",
      },
      { status: 503 }
    );
  }

  let body: {
    description?: string;
    projectName?: string;
    durationLabel?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description = (body.description ?? "").trim();
  const projectName = body.projectName?.trim() || undefined;
  const durationLabel = body.durationLabel?.trim() || undefined;

  const context = [
    projectName ? `Project: ${projectName}` : null,
    durationLabel ? `Duration: ${durationLabel}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const suggestions = await generateSuggestions(context, description);
    return Response.json({ suggestions });
  } catch (err) {
    console.error("improve-description:", err);
    const { message, status } = aiErrorMessage(err);
    return Response.json({ error: message }, { status });
  }
}
