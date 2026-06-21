import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "eey_session";

const PUBLIC_PATHS = [
  "/login",
  "/unauthorized",
  "/api/webhooks/",
];

const getJwtSecret = () =>
  new TextEncoder().encode(process.env.EECORE_JWT_SECRET ?? "");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (payload.appSlug !== process.env.EECORE_APP_SLUG) {
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
