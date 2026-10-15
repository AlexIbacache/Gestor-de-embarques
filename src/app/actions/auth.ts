"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type LoginState = {
  error: string | null;
  /**
   * Set only on success: the destination the client navigates to after showing
   * the confirmation toast. `loginAction` deliberately does not `redirect()`
   * itself, so the toast has time to render. It holds the validated `next`
   * parameter, or `/dashboard` when `next` is absent or unsafe.
   */
  redirectTo: string | null;
};

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const GENERIC_LOGIN_ERROR = "No pudimos iniciar sesión. Intentá de nuevo.";
const INVALID_CREDENTIALS_ERROR = "Las credenciales son incorrectas.";

/** Default landing page, used whenever `next` is absent or rejected. */
const DEFAULT_REDIRECT = "/dashboard";

/**
 * Returns `next` only when it is a safe internal path, otherwise
 * {@link DEFAULT_REDIRECT}. This is the open-redirect guard: `next` is
 * attacker-controllable (it is echoed into the login URL by the middleware and
 * travels through a hidden form field), so it is validated server-side before
 * the action ever reports it as a destination.
 *
 * Accepted: a path that starts with exactly one `/` (e.g. `/embarques`,
 * `/embarques?page=2`).
 *
 * Rejected, all falling back to `/dashboard`:
 *   - anything that does not start with `/` (`dashboard`, `https://evil.com`);
 *   - a protocol-relative URL (`//evil.com`, `///evil.com`);
 *   - any value containing a backslash (`/\evil.com`), which some browsers
 *     normalise to `//evil.com`;
 *   - any value containing control characters or whitespace, which browsers
 *     strip before parsing and which could smuggle a `//` past the checks above
 *     (e.g. `/<tab>/evil.com`).
 */
function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return DEFAULT_REDIRECT;
  if (!value.startsWith("/")) return DEFAULT_REDIRECT;
  if (value.startsWith("//")) return DEFAULT_REDIRECT;
  if (value.includes("\\")) return DEFAULT_REDIRECT;
  if (/[\u0000-\u001F\u007F\s]/.test(value)) return DEFAULT_REDIRECT;
  return value;
}

export async function loginAction(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next");

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    // Deliberately not the per-issue Zod messages: which field failed is not
    // the visitor's business, and reporting it leaks the validation rules.
    return { error: "Revisá los datos ingresados.", redirectTo: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";

    // Supabase auth errors are matched, never forwarded: the raw message is
    // English, can name internal auth reasons, and is not UI copy.
    if (message.includes("invalid login credentials")) {
      return { error: INVALID_CREDENTIALS_ERROR, redirectTo: null };
    }

    return { error: GENERIC_LOGIN_ERROR, redirectTo: null };
  }

  // Success: report the destination instead of redirecting. A `redirect()` here
  // would navigate before the client's confirmation toast could render, the same
  // structural problem the logout action avoids. The destination is the
  // validated `next` when it is a safe internal path, else `/dashboard`.
  return { error: null, redirectTo: safeRedirectPath(next) };
}

/**
 * Signs the user out and reports the outcome to the caller.
 *
 * Deliberately does NOT call `redirect()`: a redirect issued here navigates the
 * moment the action resolves, so a confirmation toast fired afterwards would
 * never be seen. The calling component shows the toast and then navigates to
 * `/login` itself. `signOut()` is what actually destroys the session
 * server-side — the redirect never was.
 */
export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: "No pudimos cerrar la sesión. Intentá de nuevo.",
    };
  }

  return { success: true, data: undefined };
}
