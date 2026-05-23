// SCREEN 3: Generation View

function TimelineStep({ status, label, time, idx, isLast }) {
  // status: done | running | pending
  return (
    <div style={{ display: "flex", gap: 14, position: "relative" }}>
      {/* Connector */}
      {!isLast && (
        <div style={{ position: "absolute", left: 13, top: 28, bottom: -8, width: 2, background: status === "done" ? "var(--accent)" : "var(--border-subtle)" }} />
      )}
      {/* Status icon */}
      <div style={{
        width: 28, height: 28, borderRadius: 999, flex: "none",
        display: "grid", placeItems: "center",
        background: status === "done" ? "var(--accent)" : status === "running" ? "white" : "white",
        border: status === "done" ? "none" : status === "running" ? "2px solid var(--accent)" : "2px solid var(--border)",
        color: status === "done" ? "white" : "var(--accent)",
        zIndex: 1,
      }}>
        {status === "done" && <Icon name="check" size={14} stroke={3} />}
        {status === "running" && <Icon name="pulse" size={20} />}
        {status === "pending" && <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--text-3)" }} />}
      </div>
      <div style={{ paddingBottom: 18, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: status === "pending" ? "var(--text-3)" : "var(--text)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1, minWidth: 0,
          }}>
            {label}
          </div>
          {time && (
            <span style={{ fontSize: 12, color: "var(--text-2)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{time}</span>
          )}
          {status === "running" && (
            <span className="pill pill-accent-soft" style={{ fontSize: 10.5, padding: "2px 8px", fontWeight: 700, letterSpacing: ".05em" }}>RUNNING</span>
          )}
        </div>
        {status === "running" && (
          <div style={{ marginTop: 8, height: 3, background: "var(--surface)", borderRadius: 999, overflow: "hidden", position: "relative" }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              animation: "shimmer 1.4s linear infinite",
              width: "40%",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingCursor() {
  return (
    <span style={{
      display: "inline-block",
      width: 2, height: "1em",
      background: "var(--accent)",
      verticalAlign: "text-bottom",
      marginLeft: 2,
      animation: "blink 1s steps(2, start) infinite",
    }} />
  );
}

function CVTab() {
  return (
    <div style={{ padding: "28px 32px", fontSize: 14, lineHeight: 1.65, color: "var(--text)", maxHeight: 580, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>Altrin Titus</div>
          <div className="muted" style={{ fontSize: 13.5 }}>AI Engineer · Dubai, UAE · altrin@hireloop.ai · github.com/altrint</div>
        </div>
        <span className="pill pill-accent-soft">Tailored for Deriv</span>
      </div>

      <div style={{ height: 1, background: "var(--border-subtle)", margin: "20px 0 18px" }} />

      <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-hover)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 10px" }}>Summary</h4>
      <p style={{ margin: 0 }}>
        AI Engineer with 5 years building production LLM platforms across fintech and health. Owns the full retrieval, evaluation, and inference stack — from chunking pipelines to live model registries — with a track record of <span style={{ background: "var(--accent-light)", padding: "1px 4px", borderRadius: 3 }}>reducing hallucination rates by 38%</span> on regulated clinical data.
      </p>

      <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-hover)", letterSpacing: ".12em", textTransform: "uppercase", margin: "22px 0 10px" }}>Experience</h4>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 700 }}>Senior ML Engineer · Lumen Health</div>
          <div className="muted" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>2023 — Now</div>
        </div>
        <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, color: "var(--text)" }}>
          <li>Built a <span style={{ background: "var(--accent-light)", padding: "1px 4px", borderRadius: 3 }}>LangChain</span> retrieval pipeline on <span style={{ background: "var(--accent-light)", padding: "1px 4px", borderRadius: 3 }}>Supabase pgvector</span> serving 40k clinicians; reduced hallucination by 38%.</li>
          <li>Shipped the production evaluation framework — A/B tested 14 retrieval variants over 6 months.</li>
          <li>Owned the <span style={{ background: "var(--accent-light)", padding: "1px 4px", borderRadius: 3 }}>FastAPI</span> inference layer, model registry, and on-call rotation across two timezones.</li>
        </ul>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 700 }}>ML Engineer · Deriv</div>
          <div className="muted" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>2021 — 2023</div>
        </div>
        <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
          <li>Trained and deployed pricing models in PyTorch across Kubernetes; cut p99 latency 4×.</li>
          <li>Mentored 4 junior engineers; ran the team's weekly paper-reading session<StreamingCursor /></li>
        </ul>
      </div>

      <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-hover)", letterSpacing: ".12em", textTransform: "uppercase", margin: "22px 0 10px" }}>Skills</h4>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", fontWeight: 700, marginBottom: 6, letterSpacing: ".04em" }}>FEATURED</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {["Python", "LangChain", "FastAPI", "Supabase / pgvector", "Production evaluation"].map(s => (
          <SkillTag key={s} tone="accent">{s}</SkillTag>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", fontWeight: 700, marginBottom: 6, letterSpacing: ".04em" }}>ADDITIONAL</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["PyTorch", "Docker", "Kubernetes", "AWS", "SQL", "Prefect", "Weights & Biases"].map(s => (
          <SkillTag key={s} tone="subtle">{s}</SkillTag>
        ))}
      </div>
    </div>
  );
}

function CoverLetterTab() {
  return (
    <div style={{ padding: "28px 32px", fontSize: 14, lineHeight: 1.7, color: "var(--text)", maxHeight: 580, overflowY: "auto" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>To the Deriv hiring team,</div>
      </div>
      <p>I've spent the last two years shipping LLM platforms in regulated settings — first at Deriv on the pricing side, and most recently at Lumen Health where I lead a 4-engineer team building retrieval for 40k clinicians. Your LLM Platform role reads like the next obvious step.</p>
      <p>Three things I'd bring on day one:</p>
      <ul style={{ paddingLeft: 18 }}>
        <li><b>Retrieval that actually evaluates.</b> Our pgvector + LangChain stack at Lumen runs an offline + online eval loop — I'd port the same harness to your platform within the first 30 days.</li>
        <li><b>FastAPI inference at scale.</b> The Lumen layer handles 8M requests/day with p99 under 240ms. Glad to share the architecture.</li>
        <li><b>Trader's instincts.</b> I shipped pricing models at Deriv in 2022; I know the latency budget conversations.</li>
      </ul>
      <p>Happy to dive in on a take-home or pair on a problem you're actively chewing on.</p>
      <p>— Altrin<StreamingCursor /></p>
    </div>
  );
}

function Generation({ goNav, autoApply, setAutoApply, onConfirm, onShowDiff, gotoTab }) {
  const [tab, setTab] = React.useState("cv");
  // Sync external tab control
  React.useEffect(() => { if (gotoTab) setTab(gotoTab); }, [gotoTab]);

  return (
    <div>
      <AppNav active="feed" onNav={goNav} autoApply={autoApply} onAutoApply={setAutoApply} />

      <div className="page" style={{ paddingTop: 28 }}>
        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <CompanyMark initials="AN" color="#C96442" size={48} />
            <div>
              <h2 className="h2" style={{ fontSize: 26 }}>Analytics Data Engineer</h2>
              <div className="muted" style={{ fontSize: 14, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>anthropic</span>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent-hover)", fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)", boxShadow: "0 0 0 4px rgba(0,184,217,.2)", animation: "blink 1.4s ease infinite" }} />
                  Live generation
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline btn-sm">
              <Icon name="external" size={13} />
              View job
            </button>
            <button className="btn btn-ghost btn-sm">
              <Icon name="x" size={14} />
              Cancel
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 40%) 1fr", gap: 18 }}>
          {/* Agent Timeline */}
          <div className="card" style={{ padding: 24, height: "fit-content", position: "sticky", top: 84 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <span className="section-eyebrow">Agent Timeline</span>
              <span className="muted" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>Elapsed 4.6s</span>
            </div>
            <div>
              <TimelineStep status="done" label="Analysing job description" time="1.2s" idx={0} />
              <TimelineStep status="done" label="Retrieving your experience" time="0.8s" idx={1} />
              <TimelineStep status="running" label="Writing CV" idx={2} />
              <TimelineStep status="running" label="Writing cover letter" idx={3} />
              <TimelineStep status="pending" label="QA check" idx={4} isLast />
            </div>

            <div style={{ marginTop: 18, padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Quality score</span>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>87<span style={{ color: "var(--text-3)", fontSize: 13, fontWeight: 600 }}> / 100</span></span>
              </div>
              <div style={{ height: 8, background: "var(--surface)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: "87%", height: "100%", background: "var(--accent)", borderRadius: 999, transition: "width .8s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span className="muted" style={{ fontSize: 12 }}>QA check</span>
                <span className="pill pill-ok" style={{ fontSize: 11.5 }}>
                  <Icon name="check" size={11} stroke={3} />
                  Passed
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, fontSize: 12, color: "var(--text-2)" }}>
              <Icon name="shield" size={13} />
              <span>This run cost <b style={{ color: "var(--text)" }}>0 credits</b> until you confirm.</span>
            </div>
          </div>

          {/* Generated content */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Tab toggle */}
            <div style={{ display: "flex", padding: "12px 16px 0 16px", borderBottom: "1px solid var(--border-subtle)", gap: 4 }}>
              {[
                { id: "cv", label: "CV" },
                { id: "cover", label: "Cover Letter" },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                          background: "transparent", border: 0, padding: "10px 16px",
                          fontSize: 14, fontWeight: 600,
                          color: tab === t.id ? "var(--accent-hover)" : "var(--text-2)",
                          cursor: "pointer", position: "relative",
                          borderRadius: 0,
                        }}>
                  {t.label}
                  {tab === t.id && (
                    <span style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "var(--accent)" }} />
                  )}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-2)", fontSize: 12, paddingBottom: 10 }}>
                <Icon name="pulse" size={12} />
                Streaming
              </div>
            </div>

            {tab === "cv" ? <CVTab /> : <CoverLetterTab />}

            {/* Bottom bar */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, background: "var(--bg)" }}>
              <button className="btn btn-outline btn-sm" onClick={onShowDiff}>
                <Icon name="list" size={13} />
                Show changes
              </button>
              <button className="btn btn-outline btn-sm">
                <Icon name="edit" size={13} />
                Edit
              </button>
              <div style={{ flex: 1 }} />
              <div className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="lock" size={13} />
                Unlocks when QA passes
              </div>
              <button className="btn btn-primary" disabled>
                <Icon name="lock" size={13} />
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Generation, TimelineStep, CVTab, CoverLetterTab, StreamingCursor });
