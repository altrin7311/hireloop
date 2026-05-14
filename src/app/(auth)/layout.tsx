import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#F5FFFE", color: "#0C1A1C" }}
    >
      <header className="flex h-16 items-center justify-between border-b border-[#D4F5F5] px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-base font-semibold tracking-tight">HireLoop</span>
        </Link>
        <span className="text-xs text-[#5A9EA8]">
          5 perfect applications beat 500 generic ones
        </span>
      </header>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
