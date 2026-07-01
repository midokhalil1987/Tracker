import fs from "fs/promises";
import path from "path";
import type { PublicUser } from "@/lib/auth/types";
import { AUTH_KEYS } from "@/lib/server/auth-keys";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { getRedis, isRedisConfigured } from "@/lib/server/redis-client";
import { uid } from "@/lib/utils";
import {
  isValidEmail,
  normalizeEmailRecipients,
} from "@/lib/email-recipients";

export type StoredUser = PublicUser & {
  passwordHash: string;
};

export class AuthStorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Account storage is not configured. Add Upstash Redis env vars on Vercel and redeploy."
    );
    this.name = "AuthStorageNotConfiguredError";
  }
}

export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthValidationError";
  }
}

export class AuthConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConflictError";
  }
}

export class AuthCredentialsError extends Error {
  constructor(message = "Invalid email/username or password.") {
    super(message);
    this.name = "AuthCredentialsError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

const DATA_DIR = path.join(process.cwd(), ".data", "auth");
const FILE_DB = path.join(DATA_DIR, "users.json");

type FileAuthDb = {
  users: Record<string, StoredUser>;
  usernameIndex: Record<string, string>;
  emailIndex: Record<string, string>;
  userIndex: string[];
};

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function parseIdentifier(identifier: string): {
  username: string;
  email: string | null;
} {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new AuthValidationError("Email or username is required.");
  }

  if (EMAIL_RE.test(trimmed)) {
    const email = trimmed.toLowerCase();
    const local = email.split("@")[0] ?? "user";
    const username = local.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 32);
    if (username.length < 3) {
      throw new AuthValidationError("Email local part is too short for a username.");
    }
    return { username, email };
  }

  if (!USERNAME_RE.test(trimmed)) {
    throw new AuthValidationError(
      "Username must be 3–32 characters (letters, numbers, . _ -)."
    );
  }

  return { username: trimmed, email: null };
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new AuthValidationError("Password must be at least 8 characters.");
  }
  if (password.length > 128) {
    throw new AuthValidationError("Password must be at most 128 characters.");
  }
}

async function readFileDb(): Promise<FileAuthDb> {
  try {
    const raw = await fs.readFile(FILE_DB, "utf8");
    return JSON.parse(raw) as FileAuthDb;
  } catch {
    return {
      users: {},
      usernameIndex: {},
      emailIndex: {},
      userIndex: [],
    };
  }
}

async function writeFileDb(db: FileAuthDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE_DB, JSON.stringify(db, null, 2), "utf8");
}

function shouldUseFileAuth(): boolean {
  return !isRedisConfigured() && !process.env.VERCEL;
}

async function createUserInRedis(input: {
  username: string;
  email: string;
  passwordHash: string;
}): Promise<StoredUser> {
  const redis = await getRedis();
  const usernameKey = AUTH_KEYS.username(input.username);
  const existingUsername = await redis.get<string>(usernameKey);
  if (existingUsername) {
    throw new AuthConflictError("That username is already taken.");
  }

  if (input.email) {
    const emailKey = AUTH_KEYS.email(input.email);
    const existingEmail = await redis.get<string>(emailKey);
    if (existingEmail) {
      throw new AuthConflictError("That email is already registered.");
    }
  }

  const user: StoredUser = {
    id: uid(),
    username: input.username,
    email: input.email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };

  await redis.set(AUTH_KEYS.user(user.id), user);
  await redis.set(usernameKey, user.id);
  await redis.set(AUTH_KEYS.email(input.email), user.id);
  await redis.sadd(AUTH_KEYS.userIndex, user.id);

  return user;
}

async function createUserInFile(input: {
  username: string;
  email: string;
  passwordHash: string;
}): Promise<StoredUser> {
  const db = await readFileDb();
  const usernameKey = input.username.toLowerCase();

  if (db.usernameIndex[usernameKey]) {
    throw new AuthConflictError("That username is already taken.");
  }

  if (input.email && db.emailIndex[input.email]) {
    throw new AuthConflictError("That email is already registered.");
  }

  const user: StoredUser = {
    id: uid(),
    username: input.username,
    email: input.email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.users[user.id] = user;
  db.usernameIndex[usernameKey] = user.id;
  db.emailIndex[input.email] = user.id;
  db.userIndex.push(user.id);
  await writeFileDb(db);

  return user;
}

async function findUserByIdentifierInRedis(
  identifier: string
): Promise<StoredUser | null> {
  const redis = await getRedis();
  const trimmed = identifier.trim();
  const lower = trimmed.toLowerCase();

  let userId: string | null = null;
  if (EMAIL_RE.test(trimmed)) {
    userId = await redis.get<string>(AUTH_KEYS.email(lower));
  } else {
    userId = await redis.get<string>(AUTH_KEYS.username(lower));
  }

  if (!userId) return null;
  return redis.get<StoredUser>(AUTH_KEYS.user(userId));
}

async function findUserByIdentifierInFile(
  identifier: string
): Promise<StoredUser | null> {
  const db = await readFileDb();
  const trimmed = identifier.trim();
  const lower = trimmed.toLowerCase();

  const userId = EMAIL_RE.test(trimmed)
    ? db.emailIndex[lower]
    : db.usernameIndex[lower];

  if (!userId) return null;
  return db.users[userId] ?? null;
}

async function getUserByIdInRedis(id: string): Promise<StoredUser | null> {
  const redis = await getRedis();
  return redis.get<StoredUser>(AUTH_KEYS.user(id));
}

async function getUserByIdInFile(id: string): Promise<StoredUser | null> {
  const db = await readFileDb();
  return db.users[id] ?? null;
}

export async function listUserIds(): Promise<string[]> {
  if (shouldUseFileAuth()) {
    const db = await readFileDb();
    return [...db.userIndex];
  }
  if (!isRedisConfigured()) return [];
  const redis = await getRedis();
  const ids = await redis.smembers(AUTH_KEYS.userIndex);
  return ids ?? [];
}

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
}): Promise<PublicUser> {
  validatePassword(input.password);

  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw new AuthValidationError("Enter a valid email address.");
  }

  const username = input.username.trim();
  if (!USERNAME_RE.test(username)) {
    throw new AuthValidationError(
      "Username must be 3–32 characters (letters, numbers, . _ -)."
    );
  }

  const passwordHash = await hashPassword(input.password);

  if (shouldUseFileAuth()) {
    const user = await createUserInFile({ username, email, passwordHash });
    return toPublicUser(user);
  }

  if (!isRedisConfigured()) {
    throw new AuthStorageNotConfiguredError();
  }

  const user = await createUserInRedis({ username, email, passwordHash });
  return toPublicUser(user);
}

export async function authenticateUser(input: {
  identifier: string;
  password: string;
}): Promise<PublicUser> {
  const user = shouldUseFileAuth()
    ? await findUserByIdentifierInFile(input.identifier)
    : isRedisConfigured()
      ? await findUserByIdentifierInRedis(input.identifier)
      : null;

  if (!user) throw new AuthCredentialsError();

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new AuthCredentialsError();

  return toPublicUser(user);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = shouldUseFileAuth()
    ? await getUserByIdInFile(id)
    : isRedisConfigured()
      ? await getUserByIdInRedis(id)
      : null;
  return user ? toPublicUser(user) : null;
}
