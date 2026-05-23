// SCREEN 2: Job Feed Dashboard

function MatchBadge({ pct, tone = "high" }) {
  // tone: high (solid teal), mid (outline teal), low (amber)
  const styles = {
    high: { background: "var(--accent)", color: "white", border: "none" },
    mid: { background: "var(--accent-light)", color: "var(--accent-hover)", border: "1px solid var(--border)" },
    low: { background: "var(--warn-bg)", color: "var(--warn-text)", border: "1px solid var(--warn-border)" },
  }[tone];
  return (
    <span className="pill" style={{ ...styles, fontSize: 12.5, padding: "5px 11px", fontVariantNumeric: "tabular-nums" }}>
      {pct}% match
    </span>
  );
}

function SkillTag({ children, tone = "accent" }) {
  const s = {
    accent: { background: "var(--accent-light)", color: "var(--accent-hover)", border: "1px solid var(--border)" },
    subtle: { background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-subtle)" },
    warn: { background: "var(--warn-bg)", color: "var(--warn-text)", border: "1px solid var(--warn-border)" },
  }[tone];
  return <span className="pill" style={{ ...s, fontSize: 12, padding: "3px 10px", fontWeight: 500 }}>{children}</span>;
}

function PlatformIcon({ name }) {
  // Use a colored circle with letter
  const colors = {
    LinkedIn: "#0A66C2", Indeed: "#003A9B", Greenhouse: "#0E8A4F",
    Lever: "#5347FF", Workday: "#F38B23",
  };
  return (
    <span style={{ width: 18, height: 18, borderRadius: 4, background: colors[name] || "var(--text-3)", color: "white", fontSize: 10, fontWeight: 800, display: "inline-grid", placeItems: "center", flex: "none" }}>
      {name[0]}
    </span>
  );
}

function JobCard({ job, onApply, onViewGen }) {
  const { initials, color, title, company, location, posted, platform, matchPct, matchTone, skills, salary, state, missing } = job;
  const isAutoApplied = state === "auto-applied";
  const isLow = state === "low";
  return (
    <div className="card" style={{
      padding: 20,
      opacity: isAutoApplied ? 0.78 : 1,
      borderColor: state === "high" ? "var(--border)" : "var(--border-subtle)",
      transition: "transform .15s, box-shadow .15s",
    }}>
      <div style={{ display: "flex", gap: 16 }}>
        <CompanyMark initials={initials} color={color} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "-.01em" }}>{title}</div>
              <div className="muted" style={{ fontSize: 13.5, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{company}</span>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="map-pin" size={12} /> {location}</span>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={12} /> {posted}</span>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><PlatformIcon name={platform} /> {platform}</span>
              </div>
            </div>
            <MatchBadge pct={matchPct} tone={matchTone} />
          </div>

          {isAutoApplied && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, color: "var(--accent-hover)", fontSize: 13, fontWeight: 600 }}>
              <Icon name="check" size={14} stroke={2.5} />
              Auto-applied · 12 min ago
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {skills.map((s, i) => <SkillTag key={i} tone="accent">{s}</SkillTag>)}
            {missing && missing.map((m, i) => <SkillTag key={"m" + i} tone="warn">{m} — missing</SkillTag>)}
            {salary && <SkillTag tone="subtle">{salary}</SkillTag>}
          </div>

          {!isAutoApplied && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
              {state === "high" && (
                <>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={onViewGen}>
                    <Icon name="sparkles" size={14} />
                    Review & Apply
                  </button>
                  <button className="btn btn-outline">
                    <Icon name="bookmark" size={14} />
                    Save
                  </button>
                  <button className="btn btn-ghost">
                    <Icon name="x" size={14} />
                    Skip
                  </button>
                </>
              )}
              {isLow && (
                <>
                  <button className="btn btn-accent-outline">
                    Review Anyway
                  </button>
                  <button className="btn btn-ghost">
                    <Icon name="x" size={14} />
                    Skip
                  </button>
                  {missing && (
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--warn-text)", fontSize: 12.5, fontWeight: 600 }}>
                      <Icon name="alert" size={13} /> Missing required skill
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Feed({ goNav, autoApply, setAutoApply, onOpenJob }) {
  const [platform, setPlatform] = React.useState("All");
  const [matchFilter, setMatchFilter] = React.useState("All");

  const jobs = [
    {
      id: "deriv",
      initials: "DV", color: "#0E8A8E",
      title: "AI Engineer — LLM Platform",
      company: "Deriv", location: "Dubai · Remote", posted: "2h ago", platform: "Greenhouse",
      matchPct: 91, matchTone: "high",
      skills: ["Python", "LangChain", "FastAPI", "Supabase"],
      salary: "$120k–$160k",
      state: "high",
    },
    {
      id: "gradient",
      initials: "GR", color: "#00B8D9",
      title: "ML Engineer — Recommendations",
      company: "Gradient Health", location: "Remote", posted: "5h ago", platform: "Lever",
      matchPct: 78, matchTone: "mid",
      skills: ["Python", "PyTorch"],
      state: "auto-applied",
    },
    {
      id: "anthropic",
      initials: "AN", color: "#C96442",
      title: "Data Scientist — Growth",
      company: "Anthropic", location: "San Francisco", posted: "1d ago", platform: "Greenhouse",
      matchPct: 54, matchTone: "low",
      skills: ["SQL", "Python"],
      missing: ["R"],
      state: "low",
    },
  ];

  return (
    <div>
      <AppNav active="feed" onNav={goNav} autoApply={autoApply} onAutoApply={setAutoApply} />

      <div className="page" style={{ paddingTop: 28 }}>
        {/* Stats strip */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <StatCard label="New today" value="142" sub="Across 5 platforms" />
          <StatCard label="Above 70% match" value="38" sub="Top-tier fit" accent />
          <StatCard label="Auto-applied today" value="12" sub="Submitted while you slept" />
        </div>

        {/* Filter bar */}
        <div className="card" style={{ padding: 14, marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }}>
              <Icon name="search" size={15} />
            </span>
            <input className="input" placeholder="Search role, company, or keyword…" style={{ paddingLeft: 36 }} defaultValue="" />
          </div>

          <div style={{ display: "flex", gap: 6, padding: 4, background: "var(--surface)", borderRadius: 999, border: "1px solid var(--border-subtle)" }}>
            {["All", "LinkedIn", "Indeed", "Greenhouse", "Lever", "Workday"].map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                      style={{
                        border: 0, padding: "6px 12px", borderRadius: 999,
                        fontSize: 13, fontWeight: 600,
                        background: platform === p ? "white" : "transparent",
                        color: platform === p ? "var(--text)" : "var(--text-2)",
                        boxShadow: platform === p ? "var(--shadow-sm)" : "none",
                        cursor: "pointer",
                      }}>
                {p}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, padding: 4, background: "var(--surface)", borderRadius: 999, border: "1px solid var(--border-subtle)" }}>
            {["All", "70%+", "80%+"].map(p => (
              <button key={p} onClick={() => setMatchFilter(p)}
                      style={{
                        border: 0, padding: "6px 12px", borderRadius: 999,
                        fontSize: 13, fontWeight: 600,
                        background: matchFilter === p ? "white" : "transparent",
                        color: matchFilter === p ? "var(--text)" : "var(--text-2)",
                        boxShadow: matchFilter === p ? "var(--shadow-sm)" : "none",
                        cursor: "pointer",
                      }}>
                {p}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <button className="btn btn-outline btn-sm">
            <Icon name="refresh" size={14} />
            Refresh
          </button>
        </div>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 className="h3">Today's matches</h3>
          <div className="muted" style={{ fontSize: 13 }}>Sorted by match quality</div>
        </div>

        {/* Job cards */}
        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map(j => (
            <JobCard key={j.id} job={j} onViewGen={() => onOpenJob && onOpenJob(j)} />
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Feed, MatchBadge, SkillTag, PlatformIcon, JobCard });
