import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db, schema } from "@/lib/db";
import { createClient } from "@/lib/db/supabase/server";
import { FeedView } from "@/components/feed/feed-view";

const DEFAULT_GREENHOUSE_SLUGS = ["anthropic", "openai", "stripe"];
const DEFAULT_LEVER_SLUGS = ["palantir", "netflix"];

export const dynamic = "force-dynamic";

export default async function FeedPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  let prefs: typeof schema.userPreferences.$inferSelect | undefined;
  try {
    const rows = await db()
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, user.id))
      .limit(1);
    prefs = rows[0];
  } catch (err) {
    console.error("[feed:prefs:read:ERROR]", err);
  }

  const targetRoles = prefs?.targetRoles ?? [];
  const targetLocations = prefs?.targetLocations ?? [];

  return (
    <FeedView
      scrapeDefaults={{
        query: targetRoles[0] ?? "",
        location: targetLocations[0] ?? "",
        greenhouseSlugs: DEFAULT_GREENHOUSE_SLUGS,
        leverSlugs: DEFAULT_LEVER_SLUGS,
      }}
    />
  );
}
