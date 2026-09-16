import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userForToken, type User } from "./store";

export const SESSION_COOKIE = "adsconnect_session";

export async function currentUser(): Promise<User | undefined> {
  const jar = await cookies();
  return userForToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
