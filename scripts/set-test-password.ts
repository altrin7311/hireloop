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
  const { error } = await admin.auth.admin.updateUserById(
    "9213b09b-c011-4ba0-9f68-abf9f6e86e3a",
    { password: "HireloopTest!2026" },
  );
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("OK: password set on djajc@gmail.com");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
