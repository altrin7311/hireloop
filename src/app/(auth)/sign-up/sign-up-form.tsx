"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/db/supabase/client";

const AUTO_CONFIRM = process.env.NEXT_PUBLIC_SUPABASE_AUTH_AUTO_CONFIRM === "true";

export function SignUpForm(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "http://localhost:3000/dashboard/feed",
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (AUTO_CONFIRM && data.user) {
        const confirmRes = await fetch("/api/auth/dev-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id }),
        });
        if (!confirmRes.ok) {
          const body = (await confirmRes.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? "Auto-confirm failed");
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push("/dashboard/feed");
        router.refresh();
        return;
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        className="rounded-md border px-4 py-3 text-sm"
        style={{
          background: "#E0F9FA",
          color: "#0C1A1C",
          borderColor: "#B2EDEC",
        }}
      >
        Check your inbox. Verify your email to claim your 2 free credits.
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-[#8ABCC4]">Minimum 8 characters.</p>
      </div>
      {error ? (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            background: "#FFF5E0",
            color: "#A05E00",
            borderColor: "#FFDEA0",
          }}
        >
          {error}
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
