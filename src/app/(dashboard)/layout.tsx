import { redirect } from "next/navigation";

import { AnimatedContent } from "@/components/layout/animated-content";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/server";

// `.env.local` ships with empty Supabase credentials, so `createClient()` throws
// if this layout is ever evaluated at build time. The middleware already guards
// these routes; the `getUser()` below is defence in depth for the cases where
// the matcher does not run (Server Function calls, direct prefetch), the same
// reasoning as the login page.
export const dynamic = "force-dynamic";

/**
 * `user_metadata` is typed as `{ [key: string]: any }` by supabase-js, so it is
 * re-read as `unknown` and narrowed at runtime instead of being trusted.
 */
function readFullName(metadata: unknown): string {
  if (typeof metadata !== "object" || metadata === null) return "";
  const value = (metadata as Record<string, unknown>).full_name;
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Falls back to the email local part, then to a neutral label, so the sidebar
 * never renders an empty user block.
 */
function resolveUserName(metadata: unknown, email: string): string {
  const fullName = readFullName(metadata);
  if (fullName) return fullName;

  return email.split("@")[0].trim() || "Usuario";
}

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Plain serialisable payload on purpose: the full Supabase `User` carries
  // `identities`, `factors` and provider details that must not cross the
  // server/client boundary.
  const email = user.email ?? "";
  const userInfo = {
    email,
    name: resolveUserName(user.user_metadata, email),
  };

  return (
    <TooltipProvider>
      <Toaster />
      <div className="flex min-h-dvh flex-col bg-muted/30 md:flex-row">
        <Sidebar user={userInfo} />
        {/* `min-w-0` is mandatory: without it the flex child sizes to its
            widest table and the whole page scrolls horizontally, which the
            layout spec forbids. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={userInfo} />
          <MobileNav user={userInfo} />
          <main className="flex-1 p-4 md:p-6">
            <AnimatedContent>{children}</AnimatedContent>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}