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
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

// Authenticated visitors are bounced to the dashboard by the middleware; this
// check covers the case where the middleware matcher is bypassed (Server
// Function calls, direct prefetch). It must never run at build time because
// `.env.local` ships with empty Supabase credentials.
export const dynamic = "force-dynamic";

/**
 * Next 15+ delivers `searchParams` as a Promise. The value is widened to
 * `string | string[]` because a repeated param arrives as an array; only the
 * first value is used and it is validated again in `loginAction`, so the page
 * never has to trust it.
 */
type LoginSearchParams = Promise<{ next?: string | string[] }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  // Same resolver as the middleware and the login action: an authenticated
  // visitor continues to where they were headed, not blindly to the dashboard.
  if (user) redirect(safeRedirectPath(next));

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
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </main>
    </TooltipProvider>
  );
}
