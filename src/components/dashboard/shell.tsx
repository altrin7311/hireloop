"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo-mark";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard/feed", label: "Feed" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function DashboardShell({
  email,
  initials,
  children,
}: {
  email: string;
  initials: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const [autoApply, setAutoApply] = useState(false);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#F5FFFE", color: "#0C1A1C" }}
    >
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{
          borderColor: "#D4F5F5",
          background: "rgba(245, 255, 254, 0.85)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard/feed" className="flex items-center gap-2">
              <LogoMark />
              <span className="text-base font-semibold tracking-tight">HireLoop</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#E0F9FA] text-[#0C1A1C]"
                        : "text-[#5A9EA8] hover:bg-[#E0F9FA] hover:text-[#0C1A1C]",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[#5A9EA8]">Auto Apply</span>
              <Switch checked={autoApply} onCheckedChange={setAutoApply} />
            </label>
            <Avatar>
              <AvatarFallback title={email}>{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
