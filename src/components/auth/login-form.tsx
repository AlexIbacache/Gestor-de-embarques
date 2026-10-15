"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { loginAction } from "@/app/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
    redirectTo: null,
  });

  /**
   * `loginAction` returns the destination instead of redirecting, so the
   * confirmation toast has time to render before navigation. Errors are shown
   * through the inline `Alert` below — deliberately not a toast, and
   * deliberately not both.
   */
  useEffect(() => {
    const destination = state.redirectTo;
    if (!destination) return;

    toast.success("Sesión iniciada correctamente.");
    router.replace(destination);
  }, [state.redirectTo, router]);

  return (
    <form action={formAction} className="grid gap-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>No pudimos iniciar sesión</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          required
          disabled={isPending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          disabled={isPending}
        />
      </div>

      <LoginSubmitButton />
    </form>
  );
}

function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Iniciando sesión..." : "Iniciar sesión"}
    </Button>
  );
}
