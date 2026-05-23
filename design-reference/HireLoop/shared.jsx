// Shared components: Navbar, icons, building blocks
// All components exposed on window for cross-file Babel access.

const { useState, useEffect, useRef, useMemo } = React;

// --- Icons (inline SVG) -----------------------------------------------------
function Icon({ name, size = 16, stroke = 1.75, ...rest }) {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", ...rest };
  switch (name) {
    case "check": return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>;
    case "x": return <svg {...common}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "arrow-right": return <svg {...common}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
    case "refresh": return <svg {...common}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
    case "sparkles": return <svg {...common}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /><path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z" /></svg>;
    case "lock": return <svg {...common}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case "edit": return <svg {...common}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    case "upload": return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
    case "file": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
    case "plus": return <svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case "bookmark": return <svg {...common}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>;
    case "skip": return <svg {...common}><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>;
    case "upload-cloud": return <svg {...common}><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /><polyline points="16 16 12 12 8 16" /></svg>;
    case "calendar": return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
    case "globe": return <svg {...common}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
    case "trending-up": return <svg {...common}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
    case "shield": return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "filter": return <svg {...common}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
    case "external": return <svg {...common}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;
    case "briefcase": return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
    case "map-pin": return <svg {...common}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
    case "play": return <svg {...common}><polygon points="5 3 19 12 5 21 5 3" /></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case "user": return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "alert": return <svg {...common}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "list": return <svg {...common}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
    case "send": return <svg {...common}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
    case "github": return <svg {...common}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>;
    case "linkedin": return <svg {...common}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>;
    case "circle": return <svg {...common}><circle cx="12" cy="12" r="10" /></svg>;
    case "spinner": return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
        <path d="M12 3 a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
        </path>
      </svg>
    );
    case "pulse": return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill="currentColor">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" fill="none">
          <animate attributeName="r" values="6;10;6" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
    default: return null;
  }
}

// --- Logo ---
function Logo({ size = 30 }) {
  return (
    <div className="logo">
      <div className="logo-mark" style={{ width: size, height: size, fontSize: size * 0.42, borderRadius: size * 0.27 }}>HL</div>
      <span>HireLoop</span>
    </div>
  );
}

// --- Toggle ---
function Toggle({ on, onChange }) {
  return (
    <div className={"toggle" + (on ? "" : " off")} role="switch" aria-checked={on} onClick={() => onChange && onChange(!on)} />
  );
}

// --- Avatar ---
function Avatar({ initials = "DJ" }) {
  return <div className="avatar">{initials}</div>;
}

// --- Company logo (initials in colored square) ---
function CompanyMark({ initials, color = "var(--accent)", size = 44 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 10,
      background: color,
      color: "white",
      display: "grid", placeItems: "center",
      fontWeight: 800, fontSize: size * 0.38,
      letterSpacing: "-.02em",
      boxShadow: "inset 0 -1px 0 rgba(0,0,0,.12)",
      flex: "none",
    }}>{initials}</div>
  );
}

// --- Inner app navbar (used by screens 2-6) ---
function AppNav({ active, onNav, autoApply, onAutoApply }) {
  const links = [
    { id: "feed", label: "Feed" },
    { id: "applications", label: "Applications" },
    { id: "profile", label: "Profile" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Logo />
        <div className="nav-links" style={{ marginLeft: 8 }}>
          {links.map(l => (
            <a key={l.id}
               className={"nav-link" + (active === l.id ? " active" : "")}
               onClick={() => onNav && onNav(l.id)}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="nav-spacer" />
        <div className="nav-right">
          <div className="toggle-label">
            <Icon name="sparkles" size={14} />
            Auto Apply
            <Toggle on={autoApply} onChange={onAutoApply} />
          </div>
          <button className="btn btn-ghost btn-sm" title="Settings" style={{ padding: 8 }}>
            <Icon name="settings" size={16} />
          </button>
          <Avatar initials="DJ" />
        </div>
      </div>
    </nav>
  );
}

// --- Landing navbar ---
function LandingNav({ goSignIn, goApp }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Logo />
        <div className="nav-links" style={{ marginLeft: 12 }}>
          <a className="nav-link">How it works</a>
          <a className="nav-link">Pricing</a>
          <a className="nav-link">Resume Health Check</a>
        </div>
        <div className="nav-spacer" />
        <div className="nav-right">
          <button className="btn btn-ghost btn-sm" onClick={goSignIn}>Sign in</button>
          <button className="btn btn-primary btn-sm" onClick={goApp}>
            <Icon name="sparkles" size={14} />
            Get 2 free credits
          </button>
        </div>
      </div>
    </nav>
  );
}

// Stat card
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card card-pad" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", color: accent ? "var(--accent)" : "var(--text)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

Object.assign(window, { Icon, Logo, Toggle, Avatar, CompanyMark, AppNav, LandingNav, StatCard });
