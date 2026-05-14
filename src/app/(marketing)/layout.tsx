import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo-mark";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#F5FFFE", color: "#0C1A1C" }}
    >
      <header className="sticky top-0 z-30 border-b border-[#D4F5F5] bg-[#F5FFFE]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="text-base font-semibold tracking-tight">HireLoop</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-[#5A9EA8]">
            <Link href="/#how" className="hover:text-[#0C1A1C]">
              How it works
            </Link>
            <Link href="/#pricing" className="hover:text-[#0C1A1C]">
              Pricing
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Get 2 free credits</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[#D4F5F5] py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-[#5A9EA8]">
          <span>© {new Date().getFullYear()} HireLoop</span>
          <span>5 perfect applications beat 500 generic ones.</span>
        </div>
      </footer>
    </div>
  );
}
