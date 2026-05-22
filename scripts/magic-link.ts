/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }
  const admin = createClient(url, key);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "djajc@gmail.com",
    options: {
      redirectTo: "http://localhost:3000/dashboard/feed",
    },
  });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("action_link:", data.properties?.action_link);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
