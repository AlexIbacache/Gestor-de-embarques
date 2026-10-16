import { redirect } from "next/navigation";

import { LoginArt } from "@/components/auth/login-art";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLockup } from "@/components/layout/brand-mark";
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
      <main className="grid min-h-dvh lg:grid-cols-[1.25fr_1fr]">
        {/* Brand panel: desktop only. On small screens the form leads and the
            brand collapses to the lockup above it. */}
        <section className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
          <BrandLockup />

          <div className="flex justify-center">
            <LoginArt />
          </div>

          <div className="max-w-md space-y-3">
            <h2 className="font-heading text-4xl leading-tight font-semibold text-sidebar-accent-foreground">
              Cada carga, a <span className="text-sidebar-primary">buen rumbo.</span>
            </h2>
            <p className="text-sidebar-foreground/80">
              Clientes, embarques y fechas de llegada en un solo lugar, para
              que ningún contenedor se pierda de vista.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-background px-4 py-10">
          <div className="w-full max-w-sm space-y-8">
            <div className="rounded-xl bg-sidebar p-4 lg:hidden">
              <BrandLockup />
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Bienvenido de vuelta
              </h1>
              <p className="text-muted-foreground">
                Ingresá a tu cuenta para gestionar clientes y embarques.
              </p>
            </div>

            <LoginForm next={next} />
          </div>
        </section>
      </main>
    </TooltipProvider>
  );
}
