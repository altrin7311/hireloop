// SCREEN 5: Applications History

function TrendChart() {
  // 30 data points
  const data = [3, 2, 4, 1, 0, 3, 5, 4, 2, 3, 4, 6, 5, 3, 2, 4, 7, 8, 5, 4, 6, 7, 9, 6, 5, 7, 8, 6, 4, 5];
  const max = Math.max(...data);
  const w = 800, h = 120, pad = 8;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)]);
  const path = "M " + points.map(p => p.join(",")).join(" L ");
  const areaPath = path + ` L ${w - pad},${h - pad} L ${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00B8D9" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#00B8D9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trendArea)" />
      <path d={path} fill="none" stroke="#00B8D9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        i === points.length - 1 ? (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="5" fill="white" stroke="#00B8D9" strokeWidth="2" />
            <circle cx={p[0]} cy={p[1]} r="2.5" fill="#00B8D9" />
          </g>
        ) : null
      ))}
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    Interview: { cls: "pill-ok", icon: "check" },
    Pending: { cls: "pill-accent-soft", icon: null },
    Rejected: { cls: "pill-danger", icon: "x" },
    Offer: { cls: "pill-ok", icon: "sparkles" },
  };
  const m = map[status] || { cls: "pill" };
  return (
    <span className={"pill " + m.cls} style={{ fontSize: 11.5 }}>
      {m.icon && <Icon name={m.icon} size={11} stroke={2.5} />}
      {status}
    </span>
  );
}

function AppRow({ row, hoverId, setHoverId }) {
  const isHover = hoverId === row.id;
  return (
    <tr
      onMouseEnter={() => setHoverId(row.id)}
      onMouseLeave={() => setHoverId(null)}
      style={{ borderTop: "1px solid var(--border-subtle)", background: isHover ? "var(--bg)" : "white", transition: "background .12s" }}
    >
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CompanyMark initials={row.initials} color={row.color} size={32} />
          <span style={{ fontWeight: 600 }}>{row.company}</span>
        </div>
      </td>
      <td style={{ padding: "14px 12px", color: "var(--text)" }}>{row.role}</td>
      <td style={{ padding: "14px 12px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "var(--text-2)" }}>
          <PlatformIcon name={row.platform} />
          {row.platform}
        </span>
      </td>
      <td style={{ padding: "14px 12px" }}>
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: row.match >= 85 ? "var(--accent-hover)" : "var(--text)" }}>{row.match}%</span>
      </td>
      <td style={{ padding: "14px 12px", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{row.applied}</td>
      <td style={{ padding: "14px 12px" }}>
        <StatusBadge status={row.status} />
      </td>
      <td style={{ padding: "10px 16px", textAlign: "right", width: 200 }}>
        {isHover ? (
          <div style={{ display: "inline-flex", gap: 6 }}>
            <button className="btn btn-accent-outline btn-sm">
              <Icon name="check" size={12} stroke={2.5} />
              Mark interview
            </button>
            <button className="btn btn-ghost btn-sm" title="Open application">
              <Icon name="external" size={13} />
            </button>
          </div>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}></span>
        )}
      </td>
    </tr>
  );
}

function Applications({ goNav, autoApply, setAutoApply }) {
  const [hoverId, setHoverId] = React.useState(null);
  const rows = [
    { id: 1, initials: "DV", color: "#0E8A8E", company: "Deriv", role: "AI Engineer — LLM Platform", platform: "Greenhouse", match: 91, applied: "Today, 09:24", status: "Interview" },
    { id: 2, initials: "AN", color: "#C96442", company: "Anthropic", role: "ML Engineer — Recommendations", platform: "Greenhouse", match: 87, applied: "Yesterday", status: "Pending" },
    { id: 3, initials: "PL", color: "#101418", company: "Palantir", role: "Data Engineer", platform: "Lever", match: 78, applied: "2d ago", status: "Rejected" },
    { id: 4, initials: "ST", color: "#635BFF", company: "Stripe", role: "Backend Engineer — Payments", platform: "Greenhouse", match: 74, applied: "3d ago", status: "Pending" },
    { id: 5, initials: "GR", color: "#00B8D9", company: "Gradient Health", role: "ML Engineer", platform: "Lever", match: 78, applied: "5d ago", status: "Interview" },
    { id: 6, initials: "MX", color: "#FF5A1F", company: "Modal Labs", role: "Infra Engineer", platform: "Workday", match: 71, applied: "1w ago", status: "Rejected" },
    { id: 7, initials: "RP", color: "#0A66C2", company: "Replicate", role: "Founding Engineer", platform: "LinkedIn", match: 83, applied: "1w ago", status: "Offer" },
  ];

  return (
    <div>
      <AppNav active="applications" onNav={goNav} autoApply={autoApply} onAutoApply={setAutoApply} />

      <div className="page" style={{ paddingTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <h2 className="h2" style={{ fontSize: 32 }}>Applications</h2>
            <div className="muted" style={{ marginTop: 6 }}>Every submission, with platform + status.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline btn-sm"><Icon name="filter" size={13} /> Filter</button>
            <button className="btn btn-outline btn-sm"><Icon name="calendar" size={13} /> Last 30 days</button>
          </div>
        </div>

        {/* Analytics strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <StatCard label="Applied" value="24" sub="In last 30 days" />
          <StatCard label="Interviews" value="6" sub="2 this week" accent />
          <StatCard label="Callback rate" value="25%" sub="Up from 12% last month" />
          <StatCard label="Best platform" value="Greenhouse" sub="4 of 6 interviews" />
        </div>

        {/* Trend */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div className="section-eyebrow">30-day applications</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, letterSpacing: "-.01em" }}>Picking up speed</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-2)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 2, background: "var(--accent)", display: "inline-block", borderRadius: 1 }} /> Daily submissions
              </span>
            </div>
          </div>
          <TrendChart />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
            <span>Apr 22</span><span>Apr 29</span><span>May 6</span><span>May 13</span><span>May 22</span>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="h3" style={{ fontSize: 16 }}>All submissions</h3>
            <span className="muted" style={{ fontSize: 13 }}>{rows.length} of 24 shown</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {["Company", "Role", "Platform", "Match", "Applied", "Status", ""].map((c, i) => (
                  <th key={i} style={{
                    textAlign: i === 6 ? "right" : "left",
                    padding: "10px 16px",
                    fontSize: 11.5, fontWeight: 700,
                    color: "var(--text-2)",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => <AppRow key={r.id} row={r} hoverId={hoverId} setHoverId={setHoverId} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Applications, TrendChart, StatusBadge });
