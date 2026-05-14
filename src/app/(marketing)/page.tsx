import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResumeHealthCheck } from "@/components/marketing/resume-health-check";

export default function LandingPage(): React.JSX.Element {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-[#B2EDEC] bg-[#E0F9FA] px-3 py-1 text-xs font-medium text-[#0C1A1C]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#00B8D9]" />
              Precision job application agent
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-[#0C1A1C] md:text-6xl">
              5 perfect applications
              <br />
              <span className="text-[#00B8D9]">beat 500 generic ones.</span>
            </h1>
            <p className="max-w-xl text-lg text-[#5A9EA8]">
              HireLoop scrapes 5 platforms, skips ghost jobs, then writes you a tailored CV and
              cover letter for every match. You review and confirm. We submit — without tripping
              platform anti-bot detection.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up">Get 2 free credits</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#health-check">Try the Resume Health Check</Link>
              </Button>
            </div>
            <p className="text-xs text-[#8ABCC4]">
              No subscription. Credits never expire. 1 credit = 1 submitted application.
            </p>
          </div>
        </div>
      </section>

      <section id="health-check" className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 max-w-2xl space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Try it free, right now.</h2>
          <p className="text-base text-[#5A9EA8]">
            Paste any CV and any job description. Get a brutally honest match score, the
            keywords you&apos;re missing, and 3 fixes ranked by impact. No account required.
          </p>
        </div>
        <ResumeHealthCheck />
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Upload once",
              d: "Drop your CV, cover letter, GitHub, and LinkedIn. We index everything for retrieval.",
            },
            {
              n: "02",
              t: "We hunt",
              d: "Scrapes LinkedIn, Indeed, Greenhouse, Lever, Workday daily. Ghost jobs auto-skipped.",
            },
            {
              n: "03",
              t: "You confirm. We submit.",
              d: "Side-by-side diff. Edit inline. Stealth Engine submits with human-like behaviour.",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="space-y-2 rounded-2xl border border-[#B2EDEC] bg-white p-6"
            >
              <div className="text-xs font-mono font-semibold text-[#00B8D9]">{step.n}</div>
              <div className="text-lg font-semibold tracking-tight">{step.t}</div>
              <div className="text-sm text-[#5A9EA8]">{step.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8 space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Credit packs. No subscription.</h2>
          <p className="text-base text-[#5A9EA8]">
            Buy once. Use whenever. Credits never expire.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { name: "Free Kick", price: "$0", credits: 2 },
            { name: "The Interviewer", price: "$15", credits: 20 },
            { name: "The Power Hunter", price: "$35", credits: 60 },
            { name: "The Career Pivot", price: "$60", credits: 120 },
          ].map((plan) => (
            <div
              key={plan.name}
              className="space-y-2 rounded-2xl border border-[#B2EDEC] bg-white p-6"
            >
              <div className="text-sm font-semibold text-[#5A9EA8]">{plan.name}</div>
              <div className="text-3xl font-extrabold tracking-tight">{plan.price}</div>
              <div className="text-sm text-[#0C1A1C]">{plan.credits} applications</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
