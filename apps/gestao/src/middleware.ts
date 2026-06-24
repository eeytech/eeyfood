import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "eey_session";

const PUBLIC_PATHS = [
  "/login",
  "/unauthorized",
  "/api/webhooks/",
];

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "[SECURITY] JWT_SECRET não está configurado. A aplicação não pode operar de forma segura.",
    );
  }
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

  // Falha explícita se o segredo não estiver configurado — não capturar como token inválido
  const jwtSecret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, jwtSecret);

    if (payload.application !== process.env.NEXT_PUBLIC_APP_SLUG) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload.sub ?? ""));
    requestHeaders.set("x-restaurant-id", String(payload.companyId ?? ""));
    requestHeaders.set(
      "x-user-data",
      JSON.stringify({
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        companyId: payload.companyId,
        companySlug: payload.companySlug,
        companies: payload.companies,
        permissions: payload.permissions,
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
