// SCREEN 4: CV Diff Viewer

function DiffSection({ title, side, children }) {
  const isTailored = side === "tailored";
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: isTailored ? "var(--accent-light)" : "var(--surface)",
        border: "1px solid " + (isTailored ? "var(--border)" : "var(--border-subtle)"),
        borderRadius: "12px 12px 0 0",
        borderBottom: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 999,
            background: isTailored ? "var(--accent)" : "var(--text-3)",
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: isTailored ? "var(--accent-hover)" : "var(--text-2)", letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{title}</span>
        </div>
        {isTailored && (
          <span className="pill pill-accent" style={{ fontSize: 10.5, padding: "3px 9px" }}>+12 changes</span>
        )}
      </div>
      <div style={{
        padding: "20px 22px 24px",
        background: "white",
        border: "1px solid " + (isTailored ? "var(--border)" : "var(--border-subtle)"),
        borderRadius: "0 0 12px 12px",
        fontSize: 14, lineHeight: 1.65,
      }}>
        {children}
      </div>
    </div>
  );
}

// Inline highlights for added / removed text
const Add = ({ children }) => <span style={{ background: "var(--accent-light)", color: "var(--accent-hover)", padding: "1px 4px", borderRadius: 3, fontWeight: 500 }}>{children}</span>;
const Del = ({ children }) => <span style={{ background: "#FFE9E9", color: "#A11212", padding: "1px 4px", borderRadius: 3, textDecoration: "line-through", textDecorationColor: "rgba(161,18,18,.6)" }}>{children}</span>;

function CvDiff({ goNav, autoApply, setAutoApply, onConfirm, onHideDiff }) {
  return (
    <div>
      <AppNav active="feed" onNav={goNav} autoApply={autoApply} onAutoApply={setAutoApply} />

      <div className="page" style={{ paddingTop: 28 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <CompanyMark initials="AN" color="#C96442" size={48} />
            <div>
              <h2 className="h2" style={{ fontSize: 26 }}>Analytics Data Engineer</h2>
              <div className="muted" style={{ fontSize: 14, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>anthropic</span>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span>Reviewing changes</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="pill pill-ok"><Icon name="check" size={11} stroke={3} /> QA passed · 92/100</span>
            <button className="btn btn-outline btn-sm" onClick={onHideDiff}>
              <Icon name="x" size={13} />
              Hide changes
            </button>
          </div>
        </div>

        {/* Diff legend */}
        <div style={{ display: "flex", gap: 18, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>Legend</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ width: 14, height: 14, background: "var(--accent-light)", borderRadius: 3, border: "1px solid var(--border)" }} />
            Added or rewritten
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ width: 14, height: 14, background: "#FFE9E9", borderRadius: 3, border: "1px solid #F4C2C2" }} />
            Removed
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Add>Python</Add><Add>LangChain</Add><Add>FastAPI</Add>
          </div>
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>3 sections changed · 6 keywords inserted</span>
        </div>

        {/* Side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Original */}
          <DiffSection title="Original CV" side="original">
            <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 8px" }}>Experience</h4>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700 }}>Senior ML Engineer · Lumen Health</div>
              <div className="muted" style={{ fontSize: 12.5 }}>2023 — Now</div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--text)" }}>
                <li>
                  <Del>Built a retrieval pipeline for clinicians.</Del>
                </li>
                <li>
                  <Del>Worked on reducing model errors and improved accuracy meaningfully.</Del>
                </li>
                <li>
                  <Del>Owned the inference layer and on-call rotation.</Del>
                </li>
                <li>
                  Mentored 3 junior engineers and ran the team's weekly review.
                </li>
              </ul>
            </div>

            <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", letterSpacing: ".12em", textTransform: "uppercase", margin: "18px 0 8px" }}>Skills</h4>
            <div style={{ color: "var(--text)" }}>
              <Del>Python, PyTorch, SQL, Docker, AWS, FastAPI</Del>
            </div>
          </DiffSection>

          {/* Tailored */}
          <DiffSection title="Tailored CV" side="tailored">
            <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-hover)", letterSpacing: ".12em", textTransform: "uppercase", margin: "0 0 8px" }}>Experience</h4>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700 }}>Senior ML Engineer · Lumen Health</div>
              <div className="muted" style={{ fontSize: 12.5 }}>2023 — Now</div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--text)" }}>
                <li>
                  Built a <Add>LangChain</Add> retrieval pipeline on <Add>Supabase pgvector</Add> serving <Add>40k clinicians</Add>; <Add>reduced hallucination rate by 38%</Add>.
                </li>
                <li>
                  <Add>Shipped the production evaluation framework</Add> — <Add>A/B tested 14 retrieval variants over 6 months</Add>.
                </li>
                <li>
                  Owned the <Add>FastAPI</Add> inference layer, <Add>model registry,</Add> and on-call rotation <Add>across two timezones</Add>.
                </li>
                <li>
                  Mentored <Add>4</Add> junior engineers and ran the team's weekly <Add>paper-reading</Add> session.
                </li>
              </ul>
            </div>

            <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-hover)", letterSpacing: ".12em", textTransform: "uppercase", margin: "18px 0 8px" }}>Skills</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Add>Python</Add>
              <Add>LangChain</Add>
              <Add>FastAPI</Add>
              <Add>Supabase / pgvector</Add>
              <Add>Production evaluation</Add>
              <span style={{ color: "var(--text-2)", padding: "1px 4px" }}>PyTorch, SQL, Docker, AWS</span>
            </div>
          </DiffSection>
        </div>

        {/* Action bar */}
        <div style={{
          position: "sticky", bottom: 14,
          marginTop: 24,
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 14,
          boxShadow: "var(--shadow-md)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ok-bg)", color: "var(--ok-text)", display: "grid", placeItems: "center" }}>
              <Icon name="check" size={18} stroke={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Ready to submit · 1 credit</div>
              <div className="muted" style={{ fontSize: 12.5 }}>HireLoop will fill the Greenhouse form with this tailored CV and cover letter.</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-outline">
            <Icon name="edit" size={14} />
            Edit further
          </button>
          <button className="btn btn-primary btn-lg" onClick={onConfirm}>
            <Icon name="send" size={15} />
            Confirm & Apply
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CvDiff, Add, Del });
