export const AUTH_KEYS = {
  user: (id: string) => `auth:user:${id}`,
  username: (username: string) => `auth:username:${username.toLowerCase()}`,
  email: (email: string) => `auth:email:${email.toLowerCase()}`,
  session: (token: string) => `auth:session:${token}`,
  userIndex: "auth:user-index",
} as const;

export const SESSION_COOKIE = "timely_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
