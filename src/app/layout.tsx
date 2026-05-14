import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireLoop — 5 perfect applications beat 500 generic ones",
  description:
    "HireLoop is a precision job application agent. Fewer applications, each one tailored, human-sounding, and sent through stealth automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-hl-bg text-hl-text-primary antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
