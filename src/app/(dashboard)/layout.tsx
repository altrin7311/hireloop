import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/supabase/server";
import { db, schema } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const email = user.email ?? "";
  const initials = email ? email.slice(0, 2).toUpperCase() : "HL";

  let autoApply = false;
  try {
    const [prefs] = await db()
      .select({ autoApply: schema.userPreferences.autoApply })
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, user.id))
      .limit(1);
    autoApply = prefs?.autoApply ?? false;
  } catch (err) {
    console.error("[dashboard:prefs:read:ERROR]", err);
  }

  return (
    <DashboardShell email={email} initials={initials} initialAutoApply={autoApply}>
      {children}
    </DashboardShell>
  );
}
