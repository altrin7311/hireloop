/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { groq } from "@ai-sdk/groq";
import { generateObject, generateText } from "ai";
import { z } from "zod";

const TEXT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
];

const OBJECT_MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct",
];

const ObjSchema = z.object({
  greeting: z.string(),
  language: z.string(),
});

async function probeText(model: string): Promise<boolean> {
  try {
    const r = await generateText({
      model: groq(model),
      prompt: "Say hello in one short sentence.",
    });
    const t = r.text.trim().slice(0, 120).replace(/\s+/g, " ");
    console.log(`✅ generateText  ${model} — "${t}"`);
    return true;
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.log(`❌ generateText  ${model} — ${m.split("\n")[0]?.slice(0, 240)}`);
    return false;
  }
}

async function probeObjectAuto(model: string): Promise<boolean> {
  try {
    const r = await generateObject({
      model: groq(model),
      schema: ObjSchema,
      prompt: "Return JSON: greeting='hello', language='en'.",
    });
    console.log(`✅ generateObject(auto)  ${model} — ${JSON.stringify(r.object)}`);
    return true;
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.log(`❌ generateObject(auto)  ${model} — ${m.split("\n")[0]?.slice(0, 240)}`);
    return false;
  }
}

async function probeTextJsonFallback(model: string): Promise<boolean> {
  try {
    const r = await generateText({
      model: groq(model),
      prompt:
        "Respond with ONLY valid JSON, no markdown, no prose. Shape: {\"greeting\": string, \"language\": string}. Values: greeting='hello', language='en'.",
    });
    const cleaned = r.text.replace(/```json|```/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);
    const ok = ObjSchema.safeParse(parsed);
    if (!ok.success) {
      console.log(`❌ generateText+JSON  ${model} — schema mismatch: ${ok.error.message.slice(0, 120)}`);
      return false;
    }
    console.log(`✅ generateText+JSON  ${model} — ${JSON.stringify(ok.data)}`);
    return true;
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    console.log(`❌ generateText+JSON  ${model} — ${m.split("\n")[0]?.slice(0, 240)}`);
    return false;
  }
}

async function main(): Promise<void> {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY in .env.local");
    process.exit(1);
  }

  console.log("\n— generateText —");
  for (const m of TEXT_MODELS) await probeText(m);

  console.log("\n— generateObject (auto/tool mode) —");
  for (const m of OBJECT_MODELS) await probeObjectAuto(m);

  console.log("\n— generateText + manual JSON.parse fallback —");
  for (const m of OBJECT_MODELS) await probeTextJsonFallback(m);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
