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
   * itself, so the toast has time to render. Task 6.8 will replace the
   * hardcoded value with the validated `next` parameter.
   */
  redirectTo: string | null;
};

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const GENERIC_LOGIN_ERROR = "No pudimos iniciar sesión. Intentá de nuevo.";
const INVALID_CREDENTIALS_ERROR = "Las credenciales son incorrectas.";

export async function loginAction(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

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
  // structural problem the logout action avoids. Hardcoded target for now; task
  // 6.8 fills it with the validated `next` without re-plumbing the form.
  return { error: null, redirectTo: "/dashboard" };
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
