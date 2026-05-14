import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/supabase/server";
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

  return (
    <DashboardShell email={email} initials={initials}>
      {children}
    </DashboardShell>
  );
}
