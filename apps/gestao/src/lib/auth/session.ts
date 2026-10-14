import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authConfig, getJwtSecretKey } from "./config";
import type { EeyCoreTokenPayload } from "./types";

export const getSession = async (): Promise<EeyCoreTokenPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConfig.cookie.name)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
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

/**
 * Garante que a requisição em Server Action ou Route Handler está autenticada.
 * Lança erro 401 caso não haja sessão válida.
 */
export const assertAuthenticated = async (): Promise<EeyCoreTokenPayload> => {
  const session = await getSession();
  if (!session) {
    throw new Error("Não autenticado. Por favor, efetue login para continuar.");
  }
  return session;
};

/**
 * Valida isolamento multi-tenant (IDOR):
 * Garante que o usuário autenticado pertence ao restaurante solicitado ou é SUPER_ADMIN.
 */
export const assertRestaurantAccess = async (
  targetSlugOrId?: string | null,
): Promise<EeyCoreTokenPayload> => {
  const session = await assertAuthenticated();

  if (session.role === "SUPER_ADMIN") {
    return session;
  }

  if (!targetSlugOrId) {
    return session;
  }

  const currentSlug = session.companySlug?.toLowerCase();
  const currentId = session.activeCompanyId || session.companyId;
  const target = targetSlugOrId.toLowerCase();

  const matches =
    (currentSlug && currentSlug === target) ||
    (currentId && currentId.toLowerCase() === target);

  if (!matches) {
    throw new Error(
      "Acesso negado: Você não possui permissão para acessar ou modificar dados desta unidade.",
    );
  }

  return session;
};

export interface RouteAuthUser {
  id: string;
  role: string;
  companyId: string;
  companySlug: string | null;
}

export const getRouteAuthUser = (request: Request): RouteAuthUser | null => {
  const raw = request.headers.get("x-user-data");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      id: String(parsed.id ?? ""),
      role: String(parsed.role ?? ""),
      companyId: String(parsed.companyId ?? ""),
      companySlug: typeof parsed.companySlug === "string" ? parsed.companySlug : null,
    };
  } catch {
    return null;
  }
};

export const validateRouteRestaurantAccess = (
  request: Request,
  targetSlugOrId: string,
): boolean => {
  const user = getRouteAuthUser(request);
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;

  const target = targetSlugOrId.toLowerCase();
  if (user.companySlug && user.companySlug.toLowerCase() === target) return true;
  if (user.companyId && user.companyId.toLowerCase() === target) return true;

  return false;
};
