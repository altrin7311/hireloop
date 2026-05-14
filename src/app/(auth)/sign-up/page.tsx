import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata = {
  title: "Sign up — HireLoop",
};

export default function SignUpPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0C1A1C]">
          Get 2 free credits
        </h1>
        <p className="text-sm text-[#5A9EA8]">
          Verify your email to unlock 2 free precision applications.
        </p>
      </div>
      <div className="rounded-xl border border-[#B2EDEC] bg-white p-6 shadow-sm">
        <SignUpForm />
      </div>
      <p className="text-center text-sm text-[#5A9EA8]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-[#00B8D9] hover:text-[#0097B2]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
