import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "eey_session";

const PUBLIC_PATHS = [
  "/login",
  "/unauthorized",
  "/api/webhooks/",
];

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET ?? "eeyfood_default_jwt_secret_key_2026";
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const jwtSecret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, jwtSecret);

    const expectedAppSlug = process.env.NEXT_PUBLIC_APP_SLUG ?? "gestao";
    if (payload.application && payload.application !== expectedAppSlug) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const userRole = String(payload.role ?? "");

    // Se o usuário for da Cozinha (KDS), restringir o acesso exclusivamente ao KDS e APIs
    if (userRole === "KITCHEN") {
      const isAllowed =
        pathname === "/kds" ||
        pathname.startsWith("/kds/") ||
        pathname.startsWith("/api/");

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/kds", request.url));
      }
    }

    // Se o usuário for do Painel de Senhas (TV Salão), restringir exclusivamente ao /senha e APIs
    if (userRole === "PANEL") {
      const isAllowed =
        pathname === "/senha" ||
        pathname.startsWith("/senha/") ||
        pathname.startsWith("/api/");

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/senha", request.url));
      }
    }

    // Se o usuário for Operador de Comandas / Garçom, restringir exclusivamente ao /comandas e APIs
    if (userRole === "WAITER") {
      const isAllowed =
        pathname === "/comandas" ||
        pathname.startsWith("/comandas/") ||
        pathname.startsWith("/api/");

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/comandas", request.url));
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    requestHeaders.set("x-user-id", String(payload.sub ?? ""));
    requestHeaders.set(
      "x-restaurant-id",
      String(payload.companyId ?? payload.activeCompanyId ?? ""),
    );
    requestHeaders.set(
      "x-user-data",
      JSON.stringify({
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId ?? payload.activeCompanyId,
        companySlug: payload.companySlug,
      }),
    );

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
