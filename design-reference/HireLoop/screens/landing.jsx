// SCREEN 1: Landing page
const { useState: useStateL } = React;

function Gauge({ score = 78, size = 140 }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
                stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.03em", color: "var(--text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{score}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>Match</div>
        </div>
      </div>
    </div>
  );
}

function ResumeHealthCheck() {
  const [scored, setScored] = useStateL(true);
  return (
    <section className="card" style={{ padding: 32, borderRadius: 20, boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div>
          <span className="pill pill-accent-soft" style={{ marginBottom: 12 }}>Free · No sign up</span>
          <h2 className="h2" style={{ marginTop: 10 }}>Resume Health Check</h2>
          <div className="muted" style={{ marginTop: 6, maxWidth: 580 }}>Paste your CV and any job description. We'll score the match and tell you exactly what's missing — in 4 seconds.</div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setScored(true)}>
          <Icon name="sparkles" size={16} />
          Score my CV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label className="label">Your CV</label>
          <textarea className="textarea" style={{ minHeight: 220, fontSize: 13, lineHeight: 1.6 }} defaultValue={`Altrin Titus — AI Engineer
5 years building production ML systems. Shipped LLM pipelines at fintech and health-tech startups.

EXPERIENCE
Senior ML Engineer, Lumen Health · 2023–Now
— Built retrieval pipeline serving 40k clinicians; reduced hallucination rate by 38%.
— Owned eval harness, on-call rotation, model registry.

ML Engineer, Deriv · 2021–2023
— Trained pricing models in PyTorch; deployed on Kubernetes.
— Mentored 4 juniors.

SKILLS
Python, PyTorch, SQL, Docker, AWS, FastAPI`} />
        </div>
        <div>
          <label className="label">Job description</label>
          <textarea className="textarea" style={{ minHeight: 220, fontSize: 13, lineHeight: 1.6 }} defaultValue={`AI Engineer — LLM Platform · Deriv (Remote)

We're building the LLM platform that powers Deriv's next generation of trading assistants. You'll own retrieval, evaluation, and inference infrastructure.

REQUIRED
— 3+ years in production ML
— Strong Python, LangChain, FastAPI
— Vector DB experience (Supabase / pgvector)
— Comfortable with evals & observability

NICE TO HAVE
— Trading or fintech background
— Open-source contributions`} />
        </div>
      </div>

      {scored && (
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center", padding: 24, background: "var(--bg)", border: "1px solid var(--border-subtle)", borderRadius: 16 }}>
          <Gauge score={78} />
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div className="section-eyebrow" style={{ color: "var(--warn-text)" }}>Missing keywords</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {["LangChain", "Supabase", "pgvector", "Evals harness"].map(k => (
                  <span key={k} className="pill pill-warn">{k}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="section-eyebrow">3 suggestions</div>
              <ul style={{ margin: "8px 0 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                {[
                  "Lead your Lumen bullet with the retrieval pipeline — that's the strongest signal.",
                  "Add an explicit \"LangChain / pgvector\" line to your Skills section.",
                  "Mention the eval harness as \"production evaluation framework\" — it matches their language.",
                ].map((t, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--text)" }}>
                    <span style={{ width: 18, height: 18, borderRadius: 999, background: "var(--accent-light)", color: "var(--accent-hover)", display: "grid", placeItems: "center", flex: "none", marginTop: 1 }}>
                      <Icon name="check" size={12} stroke={2.5} />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StepCard({ n, title, body, icon }) {
  return (
    <div className="card card-pad" style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-light)", color: "var(--accent-hover)", display: "grid", placeItems: "center", border: "1px solid var(--border)" }}>
          <Icon name={icon} size={20} stroke={2} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", letterSpacing: ".1em" }}>STEP {n}</div>
      </div>
      <h3 className="h3">{title}</h3>
      <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 14 }}>{body}</p>
    </div>
  );
}

function PriceCard({ name, price, credits, perCredit, features, highlight }) {
  return (
    <div className="card" style={{
      padding: 28,
      borderRadius: 16,
      position: "relative",
      border: highlight ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
      boxShadow: highlight ? "0 12px 32px -12px rgba(0,184,217,.35)" : "var(--shadow-sm)",
      background: highlight ? "linear-gradient(180deg, #FFFFFF 0%, #F0FCFC 100%)" : "white",
    }}>
      {highlight && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)" }}>
          <span className="pill pill-accent" style={{ fontSize: 11, padding: "5px 12px" }}>Most popular</span>
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", letterSpacing: ".06em", textTransform: "uppercase" }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.02em" }}>${price}</span>
        <span className="muted" style={{ fontSize: 14 }}>one-off</span>
      </div>
      <div style={{ fontSize: 15, color: "var(--text)", fontWeight: 600, marginTop: 4 }}>{credits} credits</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{perCredit}</div>
      <button className={"btn btn-block " + (highlight ? "btn-primary" : "btn-outline")} style={{ marginTop: 18 }}>
        {price === 0 ? "Start free" : "Buy credits"}
      </button>
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "20px 0 16px" }} />
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5 }}>
            <span style={{ color: "var(--accent)", flex: "none", marginTop: 2 }}><Icon name="check" size={14} stroke={2.5} /></span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Landing({ goApp }) {
  return (
    <div>
      <LandingNav goSignIn={goApp} goApp={goApp} />

      {/* Hero */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 28px 60px", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", width: 720, height: 400, background: "radial-gradient(ellipse at center, rgba(0,184,217,0.10), transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <span className="pill pill-accent-soft" style={{ padding: "6px 14px" }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)" }} />
            Precision job application agent
          </span>
          <h1 className="h1" style={{ marginTop: 22, fontSize: "clamp(48px, 7vw, 76px)" }}>
            5 perfect applications<br />
            <span style={{ color: "var(--accent)" }}>beat 500 generic ones.</span>
          </h1>
          <p style={{ marginTop: 22, fontSize: 18, color: "var(--text-2)", maxWidth: 640, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
            HireLoop scrapes 5 platforms, skips ghost jobs, then writes you a tailored CV and cover letter for every match. You review and confirm. We submit.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={goApp}>
              Get 2 free credits
              <Icon name="arrow-right" size={16} />
            </button>
            <button className="btn btn-outline btn-lg">Try the Resume Health Check</button>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 18 }}>
            No subscription. Credits never expire. 1 credit = 1 submitted application.
          </div>
        </div>
      </section>

      {/* Resume Health Check */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 28px 80px" }}>
        <ResumeHealthCheck />
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="section-eyebrow">How it works</span>
          <h2 className="h2" style={{ marginTop: 8 }}>Three steps. Zero busywork.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <StepCard n={1} icon="upload" title="Upload your docs" body="CV, GitHub, LinkedIn, and any supporting writing. We chunk and embed them — your voice stays yours." />
          <StepCard n={2} icon="sparkles" title="AI tailors every application" body="For each match we rewrite your CV and cover letter to mirror the role. You see the diff before anything ships." />
          <StepCard n={3} icon="send" title="We submit with human-like behaviour" body="Randomised typing speed, real session cookies, captcha fallback to a human-in-the-loop queue." />
        </div>
      </section>

      {/* Pricing */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span className="section-eyebrow">Pricing</span>
          <h2 className="h2" style={{ marginTop: 8 }}>Pay per application. Never per month.</h2>
          <div className="muted" style={{ marginTop: 8, fontSize: 15 }}>Credits never expire. Refunded if a submission fails our QA.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <PriceCard name="Free Kick" price={0} credits={2} perCredit="Try it on us"
                     features={["2 tailored applications", "Resume Health Check", "Manual submission", "Email support"]} />
          <PriceCard name="The Interviewer" price={15} credits={20} perCredit="$0.75 per application"
                     features={["20 tailored applications", "Auto-apply on 90%+ matches", "Diff viewer + edit", "Application tracker"]} />
          <PriceCard name="The Power Hunter" price={35} credits={60} perCredit="$0.58 per application" highlight
                     features={["60 tailored applications", "Auto-apply on 80%+ matches", "Cover letter library", "Interview prep notes", "Priority queue"]} />
          <PriceCard name="The Career Pivot" price={60} credits={120} perCredit="$0.50 per application"
                     features={["120 tailored applications", "Multi-profile (pivot mode)", "Custom application playbooks", "Concierge onboarding"]} />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 40 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Logo />
            <span className="muted" style={{ fontSize: 13 }}>© 2026 HireLoop Labs</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <a className="nav-link">Privacy</a>
            <a className="nav-link">Terms</a>
            <a className="nav-link">Status</a>
            <a className="nav-link">Changelog</a>
            <a className="nav-link">hello@hireloop.ai</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { Landing });
