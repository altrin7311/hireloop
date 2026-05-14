import { Suspense } from "react";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Sign in — HireLoop",
};

export default function SignInPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0C1A1C]">
          Welcome back
        </h1>
        <p className="text-sm text-[#5A9EA8]">
          Sign in to your HireLoop account to continue.
        </p>
      </div>
      <div className="rounded-xl border border-[#B2EDEC] bg-white p-6 shadow-sm">
        <Suspense fallback={<div className="h-48" />}>
          <SignInForm />
        </Suspense>
      </div>
      <p className="text-center text-sm text-[#5A9EA8]">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-[#00B8D9] hover:text-[#0097B2]">
          Sign up
        </Link>
      </p>
    </div>
  );
}
