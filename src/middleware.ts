import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_REDIRECT_PATH, safeRedirectPath } from "@/lib/safe-redirect";
import { updateSessionWithUser } from "@/lib/supabase/middleware";

/**
 * Route guards. The `config.matcher` below is what actually decides which
 * requests reach this function; this array mirrors it so the guard reads as a
 * single source of truth. Both must be kept in sync.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/clientes", "/embarques"];

/**
 * Both guards below resolve their destination through `@/lib/safe-redirect`, so
 * the middleware, the login page and the login action cannot drift apart.
 */

export async function middleware(request: NextRequest) {
  // One call refreshes the session, validates the JWT and yields the user, so
  // this never hits the auth server twice.
  const { response, user } = await updateSessionWithUser(request);
  const { pathname, search } = request.nextUrl;

  // Match whole path segments, not bare prefixes: `/dashboard-stats` is not
  // `/dashboard` and must not be captured by the guard.
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the target so the user returns there after signing in, but skip
    // the query string for the default landing page.
    const target = `${pathname}${search}`;
    if (target !== DEFAULT_REDIRECT_PATH) {
      loginUrl.searchParams.set("next", target);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    // An already-authenticated visitor goes where they were headed, not blindly
    // to the dashboard. Hardcoding `/dashboard` here is what silently ate the
    // preserved `next`: the moment the login action sets the session, Next
    // re-renders the current `/login?...&next=...` route, this branch fired and
    // the hardcoded dashboard won the race against the client's navigation.
    const redirectResponse = NextResponse.redirect(
      new URL(
        safeRedirectPath(request.nextUrl.searchParams.get("next")),
        request.url,
      ),
    );

    // The refresh above emitted Set-Cookie on `response`; a bare redirect would
    // drop them, leaving the browser with the pre-rotation refresh token.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/embarques/:path*",
    "/login",
  ],
};
