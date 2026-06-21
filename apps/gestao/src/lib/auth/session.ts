import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authConfig } from "./config";
import type { EeyCoreTokenPayload } from "./types";

const getJwtSecret = () =>
  new TextEncoder().encode(authConfig.eeycore.jwtSecret);

export const getSession = async (): Promise<EeyCoreTokenPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConfig.cookie.name)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as EeyCoreTokenPayload;
  } catch {
    return null;
  }
};

export const requireSession = async (): Promise<EeyCoreTokenPayload> => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
};
