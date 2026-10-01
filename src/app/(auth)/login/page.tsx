import { redirect } from "next/navigation";
import { Truck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/server";

// Authenticated visitors are bounced to the dashboard by the middleware; this
// check covers the case where the middleware matcher is bypassed (Server
// Function calls, direct prefetch). It must never run at build time because
// `.env.local` ships with empty Supabase credentials.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <TooltipProvider>
      <Toaster />
      <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Truck className="size-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresá a tu cuenta para gestionar clientes y embarques.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </main>
    </TooltipProvider>
  );
}
