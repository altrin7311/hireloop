/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

const MODEL = "llama-3.3-70b-versatile";

async function main(): Promise<void> {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY in .env.local");
    process.exit(1);
  }

  try {
    const result = await generateText({
      model: groq(MODEL),
      prompt: "Say hello",
    });
    const text = result.text.trim().slice(0, 200).replace(/\s+/g, " ");
    console.log(`✅ ${MODEL} works — response: "${text}"`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`❌ ${MODEL} failed: ${message.split("\n")[0]?.slice(0, 300)}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
