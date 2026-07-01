/** Safe user fields returned to the client (never includes password hash). */
export type PublicUser = {
  id: string;
  username: string;
  email: string | null;
  createdAt: string;
};

export type AuthSession = {
  user: PublicUser;
};
