export function verifyBearer(req: Request, envKey: string): boolean {
  const expected = process.env[envKey];
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}
