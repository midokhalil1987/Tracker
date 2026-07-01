import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/auth";
import {
  readWorkspace,
  StorageNotConfiguredError,
} from "@/lib/server/workspace-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const workspace = await readWorkspace(user.id);
    return NextResponse.json({
      workspace: workspace ?? {
        projects: [],
        tags: [],
        entries: [],
        emailReportsEnabled: false,
        emails: user.email ? [user.email] : [],
        updatedAt: null,
        lastEmailSentAt: null,
      },
    });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: error.message, setup: error.setup },
        { status: 503 }
      );
    }
    console.error("[api/workspace]", error);
    return NextResponse.json(
      { error: "Failed to load workspace." },
      { status: 500 }
    );
  }
}
