import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// `.env.local` ships with empty Supabase credentials on purpose, so this route
// must never be executed during `next build`.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `redirect` signals navigation by throwing, so it never returns and there is
  // no statement after it.
  redirect(user ? "/dashboard" : "/login");
}
