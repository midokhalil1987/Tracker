export function envPresent(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0);
}
