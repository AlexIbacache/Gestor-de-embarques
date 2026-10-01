"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type LoginState = { error: string | null };

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
    return { error: "Revisá los datos ingresados." };
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
      return { error: INVALID_CREDENTIALS_ERROR };
    }

    return { error: GENERIC_LOGIN_ERROR };
  }

  // `redirect()` throws by design. Do not catch it — the navigation must pass
  // through.
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // `redirect()` throws by design. Wrapping it in a try/catch would swallow the
  // throw and leave the caller on a page it just signed out of.
  redirect("/login");
}
