// SCREEN 7: Settings — with Plans & Billing as the primary section

function SidebarLink({ icon, label, active, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px",
      borderRadius: 8,
      border: 0,
      background: active ? "var(--accent-light)" : "transparent",
      color: active ? "var(--accent-hover)" : "var(--text)",
      fontWeight: active ? 600 : 500,
      fontSize: 14,
      cursor: "pointer",
      width: "100%",
      textAlign: "left",
      transition: "background .12s",
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface)"; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <span style={{ color: active ? "var(--accent)" : "var(--text-3)", display: "inline-flex" }}>
        <Icon name={icon} size={15} />
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {sub && <span className="muted" style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{sub}</span>}
    </button>
  );
}

function CurrentPlanBanner() {
  const used = 13, total = 60;
  const pct = (used / total) * 100;
  return (
    <div style={{
      borderRadius: 16,
      padding: 24,
      background: "linear-gradient(135deg, #0E7A8E 0%, #00B8D9 100%)",
      color: "white",
      position: "relative",
      overflow: "clip",
      boxShadow: "0 10px 30px -10px rgba(0,184,217,.4)",
    }}>
      {/* Decorative dot grid */}
      <div style={{
        position: "absolute", top: -40, right: -40, width: 220, height: 220,
        background: "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1.5px)",
        backgroundSize: "12px 12px",
        opacity: 0.35,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, position: "relative", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.8 }}>Current plan</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>The Power Hunter</h3>
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, whiteSpace: "nowrap" }}>· $35 / 60 credits</span>
          </div>
          <div style={{ marginTop: 4, opacity: 0.9, fontSize: 14 }}>
            Purchased March 14, 2026 · Credits never expire
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.8 }}>Credits remaining</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>{total - used}</span>
            <span style={{ fontSize: 14, opacity: 0.75 }}> / {total}</span>
          </div>
        </div>
      </div>

      {/* Usage bar */}
      <div style={{ marginTop: 20, position: "relative" }}>
        <div style={{ height: 6, background: "rgba(255,255,255,0.18)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: "white", borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5, opacity: 0.9 }}>
          <span>{used} applications submitted this cycle</span>
          <span>{Math.round(pct)}% used</span>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={{
          background: "white", color: "var(--accent-hover)", border: 0,
          padding: "10px 18px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}>
          <Icon name="sparkles" size={14} />
          Buy more credits
        </button>
        <button style={{
          background: "rgba(255,255,255,0.15)", color: "white",
          border: "1px solid rgba(255,255,255,0.3)",
          padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>
          View usage
        </button>
      </div>
    </div>
  );
}

function PlanFeature({ children }) {
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.5 }}>
      <span style={{ color: "var(--accent)", flex: "none", marginTop: 2 }}><Icon name="check" size={14} stroke={2.5} /></span>
      <span>{children}</span>
    </li>
  );
}

function PlanCardInline({ name, price, credits, perCredit, features, state, highlight }) {
  // state: 'current' | 'upgrade' | 'downgrade' | 'select'
  const isCurrent = state === "current";
  const isHighlight = highlight && !isCurrent;
  const labelMap = {
    current: "Current plan",
    upgrade: "Upgrade",
    downgrade: "Downgrade",
    select: price === 0 ? "Start free" : "Buy credits",
  };
  return (
    <div style={{
      padding: 22,
      borderRadius: 14,
      border: isHighlight ? "1px solid var(--accent)" : isCurrent ? "1px solid var(--accent-hover)" : "1px solid var(--border-subtle)",
      background: isCurrent ? "linear-gradient(180deg, #F5FFFE 0%, #FFFFFF 100%)" : "white",
      boxShadow: isHighlight ? "0 8px 24px -10px rgba(0,184,217,.3)" : "var(--shadow-sm)",
      position: "relative",
      display: "flex", flexDirection: "column",
    }}>
      {(isCurrent || isHighlight) && (
        <div style={{ position: "absolute", top: -10, left: 18 }}>
          <span className="pill" style={{
            fontSize: 10.5, padding: "3px 10px", fontWeight: 700,
            background: isCurrent ? "var(--accent-hover)" : "var(--accent)",
            color: "white", border: 0,
            letterSpacing: ".04em",
          }}>{isCurrent ? "CURRENT" : "MOST POPULAR"}</span>
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "-.01em" }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.025em", fontVariantNumeric: "tabular-nums" }}>${price}</span>
        <span className="muted" style={{ fontSize: 13 }}>one-off</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 600 }}>{credits} credits</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{perCredit}</div>

      <button
        disabled={isCurrent}
        className={"btn " + (
          isCurrent ? "btn-outline" :
          state === "downgrade" ? "btn-outline" :
          isHighlight ? "btn-primary" : "btn-outline"
        )}
        style={{
          marginTop: 16,
          width: "100%",
          cursor: isCurrent ? "default" : "pointer",
          opacity: isCurrent ? 0.55 : 1,
        }}>
        {labelMap[state]}
        {state === "upgrade" && <Icon name="arrow-right" size={14} />}
      </button>

      <div style={{ height: 1, background: "var(--border-subtle)", margin: "18px 0 14px" }} />
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 9 }}>
        {features.map((f, i) => <PlanFeature key={i}>{f}</PlanFeature>)}
      </ul>
    </div>
  );
}

function CreditPack({ count, price, save, popular }) {
  return (
    <div style={{
      flex: 1, padding: 16,
      border: "1px solid " + (popular ? "var(--accent)" : "var(--border-subtle)"),
      borderRadius: 12,
      background: popular ? "var(--accent-light)" : "white",
      position: "relative",
      cursor: "pointer",
      transition: "all .12s",
    }}>
      {popular && (
        <span className="pill" style={{
          position: "absolute", top: -10, right: 12,
          fontSize: 10, padding: "2px 8px",
          background: "var(--accent)", color: "white", border: 0,
        }}>BEST VALUE</span>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>+{count}</span>
        <span className="muted" style={{ fontSize: 13 }}>credits</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>${price}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
        {save ? `Save ${save}` : `$${(price / count).toFixed(2)} per credit`}
      </div>
    </div>
  );
}

function PaymentMethodCard() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: 16,
      border: "1px solid var(--border-subtle)",
      borderRadius: 12,
      background: "white",
    }}>
      <div style={{
        width: 46, height: 32,
        background: "linear-gradient(135deg, #1A1F71, #0E4F9E)",
        borderRadius: 6,
        display: "grid", placeItems: "center",
        color: "white", fontWeight: 800, fontSize: 11, letterSpacing: ".05em",
        flex: "none",
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,.2)",
      }}>VISA</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>•••• •••• •••• 4242</div>
        <div className="muted" style={{ fontSize: 12.5 }}>Expires 09 / 2028 · Billing address: Dubai, UAE</div>
      </div>
      <button className="btn btn-outline btn-sm">Update</button>
      <button className="btn btn-ghost btn-sm" title="Remove" style={{ padding: 8 }}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function InvoiceRow({ inv, hoverId, setHoverId }) {
  const isHover = hoverId === inv.id;
  return (
    <tr
      onMouseEnter={() => setHoverId(inv.id)}
      onMouseLeave={() => setHoverId(null)}
      style={{ borderTop: "1px solid var(--border-subtle)", background: isHover ? "var(--bg)" : "transparent", transition: "background .12s" }}
    >
      <td style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums", color: "var(--text-2)", fontSize: 13 }}>{inv.id}</td>
      <td style={{ padding: "12px 12px", color: "var(--text)" }}>{inv.desc}</td>
      <td style={{ padding: "12px 12px", color: "var(--text-2)", fontVariantNumeric: "tabular-nums", fontSize: 13.5 }}>{inv.date}</td>
      <td style={{ padding: "12px 12px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${inv.amount.toFixed(2)}</td>
      <td style={{ padding: "12px 12px" }}>
        <span className={"pill " + (inv.status === "Paid" ? "pill-ok" : inv.status === "Refunded" ? "pill" : "pill-warn")} style={{ fontSize: 11.5 }}>
          {inv.status === "Paid" && <Icon name="check" size={11} stroke={3} />}
          {inv.status}
        </span>
      </td>
      <td style={{ padding: "10px 16px", textAlign: "right" }}>
        <div style={{ display: "inline-flex", gap: 4, opacity: isHover ? 1 : 0.6, transition: "opacity .12s" }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: "6px 10px" }}>
            <Icon name="external" size={13} />
          </button>
          <button className="btn btn-outline btn-sm">Download</button>
        </div>
      </td>
    </tr>
  );
}

function PlansSection() {
  const [hoverInv, setHoverInv] = React.useState(null);
  const invoices = [
    { id: "INV-2026-014", desc: "The Power Hunter · 60 credits", date: "Mar 14, 2026", amount: 35.00, status: "Paid" },
    { id: "INV-2026-009", desc: "Credit top-up · +20", date: "Feb 28, 2026", amount: 12.00, status: "Paid" },
    { id: "INV-2026-002", desc: "The Interviewer · 20 credits", date: "Jan 19, 2026", amount: 15.00, status: "Paid" },
    { id: "INV-2025-088", desc: "Credit top-up · +10", date: "Dec 22, 2025", amount: 7.00, status: "Refunded" },
    { id: "INV-2025-064", desc: "Free Kick", date: "Nov 03, 2025", amount: 0.00, status: "Paid" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 28 }}>
      {/* Current plan banner */}
      <CurrentPlanBanner />

      {/* Change plan */}
      <section>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <h3 className="h3">Change plan</h3>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>Pay once. Credits never expire. Refunded if a submission fails our QA.</div>
          </div>
          <span className="muted" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>1 credit = 1 submitted application</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <PlanCardInline name="Free Kick" price={0} credits={2} perCredit="Try it on us"
                          state="downgrade"
                          features={["2 tailored applications", "Resume Health Check", "Manual submission", "Email support"]} />
          <PlanCardInline name="The Interviewer" price={15} credits={20} perCredit="$0.75 per application"
                          state="downgrade"
                          features={["20 tailored applications", "Auto-apply on 90%+ matches", "Diff viewer + edit", "Application tracker"]} />
          <PlanCardInline name="The Power Hunter" price={35} credits={60} perCredit="$0.58 per application" highlight
                          state="current"
                          features={["60 tailored applications", "Auto-apply on 80%+ matches", "Cover letter library", "Interview prep notes", "Priority queue"]} />
          <PlanCardInline name="The Career Pivot" price={60} credits={120} perCredit="$0.50 per application"
                          state="upgrade"
                          features={["120 tailored applications", "Multi-profile (pivot mode)", "Custom application playbooks", "Concierge onboarding"]} />
        </div>
      </section>

      {/* Credit packs */}
      <section className="card card-pad" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Top up credits</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Stay on your current plan. Add credits when you need them.</div>
          </div>
          <span className="pill pill-accent-soft"><Icon name="sparkles" size={12} /> Instant top-up</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <CreditPack count={10} price={7} />
          <CreditPack count={25} price={15} popular save="14%" />
          <CreditPack count={60} price={30} save="29%" />
          <CreditPack count={150} price={65} save="38%" />
        </div>
      </section>

      {/* Payment method */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 className="h3" style={{ fontSize: 16 }}>Payment method</h3>
          <button className="btn btn-ghost btn-sm">
            <Icon name="plus" size={13} />
            Add method
          </button>
        </div>
        <PaymentMethodCard />
      </section>

      {/* Invoices */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 className="h3" style={{ fontSize: 16 }}>Billing history</h3>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Receipts are emailed to <b>altrin@hireloop.ai</b> after each purchase.</div>
          </div>
          <button className="btn btn-outline btn-sm">
            <Icon name="external" size={13} />
            Export all
          </button>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {["Invoice", "Description", "Date", "Amount", "Status", ""].map((c, i) => (
                  <th key={i} style={{
                    textAlign: i === 5 ? "right" : "left",
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
              {invoices.map(inv => <InvoiceRow key={inv.id} inv={inv} hoverId={hoverInv} setHoverId={setHoverInv} />)}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h3 className="h3" style={{ fontSize: 16, marginBottom: 12 }}>Common questions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {[
            { q: "Do credits ever expire?", a: "No — every credit you buy stays in your account until used. Pause your search for 6 months and they'll be right where you left them." },
            { q: "What happens if a submission fails?", a: "Our QA catches platform errors and captcha walls before the credit is charged. If a submission slips through and fails, we automatically refund the credit." },
            { q: "Can I downgrade?", a: "You can switch tiers any time. Unused credits carry over — they're yours regardless of which plan you're on." },
            { q: "Is there an enterprise / team plan?", a: "Yes. For 5+ seats we offer pooled credits, an admin console, and a private application queue. Email sales@hireloop.ai." },
          ].map((f, i) => (
            <div key={i} className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{f.q}</div>
              <div className="muted" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.55 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20 }}>
      <section className="card card-pad" style={{ padding: 24 }}>
        <h3 className="h3" style={{ fontSize: 16, marginBottom: 16 }}>Account details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div>
            <label className="label">Full name</label>
            <input className="input" defaultValue="Altrin Titus" />
          </div>
          <div>
            <label className="label">Display initials</label>
            <input className="input" defaultValue="DJ" maxLength="2" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" defaultValue="altrin@hireloop.ai" type="email" />
          </div>
          <div>
            <label className="label">Time zone</label>
            <select className="select" defaultValue="Asia/Dubai">
              <option>Asia/Dubai</option>
              <option>Europe/London</option>
              <option>America/New_York</option>
              <option>America/Los_Angeles</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card card-pad" style={{ padding: 24 }}>
        <h3 className="h3" style={{ fontSize: 16, marginBottom: 4 }}>Danger zone</h3>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>These actions are irreversible.</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, border: "1px solid var(--danger-border)", background: "#FFFAFA", borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--danger-text)" }}>Delete account</div>
            <div className="muted" style={{ fontSize: 12.5 }}>Removes all data and refunds remaining credits. Cannot be undone.</div>
          </div>
          <button className="btn btn-outline btn-sm" style={{ color: "var(--danger-text)", borderColor: "var(--danger-border)" }}>Delete account</button>
        </div>
      </section>
    </div>
  );
}

function NotificationsSection() {
  const items = [
    { id: "match", label: "New high-match jobs", desc: "Daily digest of jobs above your auto-apply threshold.", email: true, push: true },
    { id: "auto", label: "Auto-apply receipts", desc: "Get a summary every time the agent submits on your behalf.", email: true, push: false },
    { id: "interview", label: "Interview requests", desc: "We detect recruiter replies in your inbox.", email: true, push: true },
    { id: "weekly", label: "Weekly performance", desc: "Callback rate, best platforms, and what to tweak.", email: true, push: false },
    { id: "product", label: "Product updates", desc: "Major releases only. Roughly once a month.", email: false, push: false },
  ];
  return (
    <div className="card card-pad" style={{ padding: 24 }}>
      <h3 className="h3" style={{ fontSize: 16, marginBottom: 4 }}>Notifications</h3>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>Choose what HireLoop tells you about, and where.</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--text-2)", letterSpacing: ".06em", textTransform: "uppercase" }}>Event</th>
            <th style={{ width: 80, textAlign: "center", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--text-2)", letterSpacing: ".06em", textTransform: "uppercase" }}>Email</th>
            <th style={{ width: 80, textAlign: "center", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--text-2)", letterSpacing: ".06em", textTransform: "uppercase" }}>Push</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "14px 12px" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{it.label}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{it.desc}</div>
              </td>
              <td style={{ textAlign: "center", padding: "14px 12px" }}>
                <Toggle on={it.email} onChange={() => {}} />
              </td>
              <td style={{ textAlign: "center", padding: "14px 12px" }}>
                <Toggle on={it.push} onChange={() => {}} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegrationsSection() {
  const integrations = [
    { id: "linkedin", name: "LinkedIn", desc: "Pull your profile + post history into your evidence pool.", icon: "linkedin", color: "#0A66C2", connected: true, account: "altrin-titus" },
    { id: "github", name: "GitHub", desc: "Use your repos and READMEs to ground technical claims.", icon: "github", color: "#101418", connected: true, account: "altrint" },
    { id: "greenhouse", name: "Greenhouse", desc: "Faster auto-apply on Greenhouse-hosted careers pages.", icon: "briefcase", color: "#0E8A4F", connected: true, account: null },
    { id: "lever", name: "Lever", desc: "Faster auto-apply on Lever-hosted careers pages.", icon: "briefcase", color: "#5347FF", connected: false },
    { id: "gmail", name: "Gmail", desc: "Detect recruiter replies and surface interview requests.", icon: "send", color: "#EA4335", connected: false },
    { id: "calendar", name: "Google Calendar", desc: "Auto-schedule interview prep blocks the day before.", icon: "calendar", color: "#1A73E8", connected: false },
  ];
  return (
    <div className="card card-pad" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h3 className="h3" style={{ fontSize: 16 }}>Integrations</h3>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>Connect data sources to ground every tailored application in your real history.</div>
        </div>
        <span className="pill"><Icon name="shield" size={12} /> Read-only · OAuth</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {integrations.map(it => (
          <div key={it.id} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: 16,
            border: "1px solid " + (it.connected ? "var(--border)" : "var(--border-subtle)"),
            borderRadius: 12,
            background: it.connected ? "var(--accent-light)" : "white",
            transition: "all .12s",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: it.color, color: "white",
              display: "grid", placeItems: "center",
              flex: "none",
            }}>
              <Icon name={it.icon} size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{it.name}</div>
                {it.connected && <span className="pill pill-ok" style={{ fontSize: 10.5, padding: "2px 8px" }}><Icon name="check" size={10} stroke={3} /> Connected</span>}
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                {it.connected && it.account ? <><b style={{ color: "var(--text-2)" }}>@{it.account}</b> · </> : null}
                {it.desc}
              </div>
            </div>
            <button className={"btn btn-sm " + (it.connected ? "btn-outline" : "btn-primary")}>
              {it.connected ? "Manage" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 }}>
      <section className="card card-pad" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 className="h3" style={{ fontSize: 16 }}>Personal access token</h3>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>For pulling your applications into private spreadsheets, BI tools, or your own scripts.</div>
          </div>
          <button className="btn btn-primary btn-sm">
            <Icon name="plus" size={13} />
            New token
          </button>
        </div>
        <div style={{
          padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 10,
          background: "var(--bg)", display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>local-dev</div>
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5, color: "var(--text-2)" }}>hlpat_•••••••••••••••••••KsB2</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Created Mar 14 · Last used 2h ago</div>
          </div>
          <button className="btn btn-outline btn-sm">Revoke</button>
        </div>
      </section>
    </div>
  );
}

function Settings({ goNav, autoApply, setAutoApply }) {
  const [section, setSection] = React.useState("plans");

  const sections = [
    { id: "account", label: "Account", icon: "user" },
    { id: "plans", label: "Plans & Billing", icon: "sparkles" },
    { id: "notifications", label: "Notifications", icon: "alert" },
    { id: "integrations", label: "Integrations", icon: "globe", sub: "3" },
    { id: "api", label: "API tokens", icon: "shield" },
  ];

  const titles = {
    account: "Account",
    plans: "Plans & Billing",
    notifications: "Notifications",
    integrations: "Integrations",
    api: "API tokens",
  };
  const subtitles = {
    account: "Your profile, email and time zone.",
    plans: "Manage your plan, credits, payment method, and invoices.",
    notifications: "Choose what we email and push.",
    integrations: "Grant HireLoop read-only access to your professional data.",
    api: "Programmatic access for power users.",
  };

  return (
    <div>
      <AppNav active="settings" onNav={goNav} autoApply={autoApply} onAutoApply={setAutoApply} />

      <div className="page" style={{ paddingTop: 28, maxWidth: 1280 }}>
        <div className="settings-grid">
          {/* Sidebar */}
          <aside style={{ position: "sticky", top: 84, height: "fit-content" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: ".12em", textTransform: "uppercase", padding: "4px 12px", marginBottom: 6 }}>Settings</div>
            <div style={{ display: "grid", gap: 2 }}>
              {sections.map(s => (
                <SidebarLink key={s.id}
                             icon={s.icon}
                             label={s.label}
                             sub={s.sub}
                             active={section === s.id}
                             onClick={() => setSection(s.id)} />
              ))}
            </div>

            <div style={{ marginTop: 24, padding: 14, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Need help?</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Our team replies within 4 hours, every day.</div>
              <a className="nav-link" style={{ padding: 0, fontSize: 12.5, fontWeight: 600, color: "var(--accent-hover)", marginTop: 8, display: "inline-flex", gap: 4 }}>
                Contact support
                <Icon name="arrow-right" size={12} />
              </a>
            </div>
          </aside>

          {/* Main */}
          <main style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 className="h2" style={{ fontSize: 28 }}>{titles[section]}</h2>
              <div className="muted" style={{ marginTop: 4 }}>{subtitles[section]}</div>
            </div>

            {section === "plans" && <PlansSection />}
            {section === "account" && <AccountSection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "integrations" && <IntegrationsSection />}
            {section === "api" && <ApiSection />}
          </main>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Settings });
