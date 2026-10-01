import type { User } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Refreshes the Supabase session on the incoming request and returns both the
 * response carrying any rotated auth cookies and the authenticated user.
 *
 * Contains no redirect logic on purpose: `src/middleware.ts` owns routing
 * decisions, so it can inspect the refreshed session before deciding where an
 * unauthenticated visitor belongs.
 *
 * The user comes from the same `getUser()` call that performs the refresh, so
 * reading it here costs no extra network round trip.
 */
export async function updateSessionWithUser(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
          // A refresh emits Set-Cookie. Without no-store headers a CDN or
          // reverse proxy can cache one user's response and serve their
          // session to somebody else.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value)
          }
        },
      },
    },
  )

  // Validates the JWT against the auth server and performs the token refresh,
  // which writes cookies through `setAll`. Must run before the response is
  // returned, otherwise the refreshed token is lost.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}

/**
 * Refreshes the Supabase session and returns only the response.
 *
 * The presence of an auth cookie is deliberately not used as the "is signed in"
 * signal: `@supabase/ssr` only calls `setAll` when the session is actually
 * refreshed, so a request carrying a still-valid session sets no cookie at all.
 * Callers that need to know who is signed in must use `updateSessionWithUser`.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const { response } = await updateSessionWithUser(request)

  return response
}
