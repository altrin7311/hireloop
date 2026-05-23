// SCREEN 6: Profile

function Dropzone() {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={e => { e.preventDefault(); setHover(false); }}
      style={{
        border: "2px dashed " + (hover ? "var(--accent)" : "var(--border)"),
        background: hover ? "var(--accent-light)" : "var(--bg)",
        borderRadius: 14,
        padding: "36px 28px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all .15s",
      }}>
      <div style={{
        width: 56, height: 56, borderRadius: 999, margin: "0 auto 12px",
        background: "var(--accent-light)", color: "var(--accent)",
        display: "grid", placeItems: "center",
        border: "1px solid var(--border)",
      }}>
        <Icon name="plus" size={24} stroke={2.5} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Drop files here, or <span style={{ color: "var(--accent-hover)" }}>click to browse</span></div>
      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>PDF, .md, .txt — up to 10MB each</div>
    </div>
  );
}

function UploadedFile({ name, size, chunks, done }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px",
      border: "1px solid var(--border)",
      background: "var(--accent-light)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: "white", color: "var(--accent-hover)",
        display: "grid", placeItems: "center",
        border: "1px solid var(--border-subtle)",
        flex: "none",
      }}>
        <Icon name="file" size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 12.5, color: "var(--accent-hover)", marginTop: 2, display: "flex", gap: 10, alignItems: "center" }}>
          <span>{size}</span>
          <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--text-3)" }} />
          <span>{chunks} chunk{chunks > 1 ? "s" : ""}</span>
          <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--text-3)" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
            Done <Icon name="check" size={11} stroke={3} />
          </span>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ padding: 8 }} title="Re-upload"><Icon name="refresh" size={14} /></button>
      <button className="btn btn-ghost btn-sm" style={{ padding: 8 }} title="Remove"><Icon name="x" size={14} /></button>
    </div>
  );
}

function Toast({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", bottom: 80, right: 24, zIndex: 90,
      background: "white",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "var(--shadow-lg)",
      animation: "slideUp .25s ease",
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 999,
        background: "var(--accent)", color: "white",
        display: "grid", placeItems: "center",
      }}>
        <Icon name="check" size={14} stroke={3} />
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Preferences saved</div>
        <div className="muted" style={{ fontSize: 12 }}>Applied to future generations</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : "auto" }}>
      <label className="label">{label}</label>
      {children}
      {hint && <div className="hint" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function Radio({ value, label, name, checked, onChange }) {
  return (
    <label style={{
      flex: 1,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: "10px 12px",
      border: "1px solid " + (checked ? "var(--accent)" : "var(--border)"),
      background: checked ? "var(--accent-light)" : "white",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 13.5, fontWeight: 600,
      color: checked ? "var(--accent-hover)" : "var(--text)",
      transition: "all .15s",
    }}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} style={{ display: "none" }} />
      <span style={{
        width: 14, height: 14, borderRadius: 999,
        border: "2px solid " + (checked ? "var(--accent)" : "var(--text-3)"),
        background: checked ? "var(--accent)" : "white",
        boxShadow: checked ? "inset 0 0 0 2.5px white" : "none",
        transition: "all .15s",
      }} />
      {label}
    </label>
  );
}

function Profile({ goNav, autoApply, setAutoApply }) {
  const [docType, setDocType] = React.useState("CV / Resume");
  const [tone, setTone] = React.useState("technical");
  const [toast, setToast] = React.useState(false);

  return (
    <div>
      <AppNav active="profile" onNav={goNav} autoApply={autoApply} onAutoApply={setAutoApply} />

      <div className="page" style={{ paddingTop: 28, maxWidth: 980 }}>
        {/* Header */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "linear-gradient(135deg, #00B8D9, #0E7A8E)",
            color: "white", display: "grid", placeItems: "center",
            fontSize: 20, fontWeight: 800, letterSpacing: ".02em",
            boxShadow: "0 6px 16px -4px rgba(0,184,217,.35)",
          }}>DJ</div>
          <div style={{ flex: 1 }}>
            <h2 className="h2" style={{ fontSize: 30 }}>Profile</h2>
            <div className="muted" style={{ marginTop: 4 }}>Upload your CV, cover letter, and supporting documents.</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted" style={{ fontSize: 12 }}>Credits remaining</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: "var(--accent-hover)", fontVariantNumeric: "tabular-nums" }}>47</div>
          </div>
        </div>

        {/* Documents */}
        <div className="card card-pad" style={{ padding: 24, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h3 className="h3">Documents</h3>
              <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>HireLoop chunks each document and embeds it so the agent can quote you accurately.</div>
            </div>
            <div style={{ minWidth: 220 }}>
              <select className="select" value={docType} onChange={e => setDocType(e.target.value)}>
                <option>CV / Resume</option>
                <option>Cover letter template</option>
                <option>Writing sample</option>
                <option>Project case study</option>
                <option>Reference letter</option>
              </select>
            </div>
          </div>

          <Dropzone />

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <UploadedFile name="Altrin Titus — CV.pdf" size="79.6 KB" chunks={1} done />
            <UploadedFile name="Cover letter — generic.md" size="4.2 KB" chunks={1} done />
            <UploadedFile name="Lumen Health case study.pdf" size="312 KB" chunks={3} done />
          </div>
        </div>

        {/* Job preferences */}
        <div className="card card-pad" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h3 className="h3">Job Preferences</h3>
              <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>Shape every tailored application — and what we never mention.</div>
            </div>
            <span className="pill pill-accent-soft"><Icon name="sparkles" size={12} /> Used by the agent</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Target roles">
              <input className="input" defaultValue="AI Engineer, Software Engineer" />
            </Field>
            <Field label="Target locations">
              <input className="input" defaultValue="Remote, Dubai, UAE" />
            </Field>

            <Field label="Seniority">
              <select className="select" defaultValue="Mid-level">
                <option>Junior</option>
                <option>Mid-level</option>
                <option>Senior</option>
                <option>Staff / Principal</option>
              </select>
            </Field>
            <Field label="Tone of voice" hint="How tailored writing should read.">
              <div style={{ display: "flex", gap: 8 }}>
                <Radio name="tone" value="formal" label="Formal" checked={tone === "formal"} onChange={setTone} />
                <Radio name="tone" value="conversational" label="Conversational" checked={tone === "conversational"} onChange={setTone} />
                <Radio name="tone" value="technical" label="Technical" checked={tone === "technical"} onChange={setTone} />
              </div>
            </Field>

            <Field label="Salary expectation">
              <input className="input" defaultValue="$80,000 – $120,000" />
            </Field>
            <Field label="Notice period">
              <input className="input" defaultValue="1 month" />
            </Field>

            <Field label="Always emphasize" hint="Themes the agent should pull forward on every tailored CV." span={2}>
              <textarea className="textarea" style={{ minHeight: 80 }} defaultValue="Led AI projects, shipped to production at scale, mentored engineers, evaluation-first mindset." />
            </Field>

            <Field label="Never mention" hint="Topics or roles to leave out — politics, gaps you'd rather not explain, etc." span={2}>
              <textarea className="textarea" style={{ minHeight: 80 }} placeholder="Nothing yet — your full history is fair game." />
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border-subtle)" }}>
            <div className="muted" style={{ fontSize: 12.5 }}>Last saved 3 days ago</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline">Discard</button>
              <button className="btn btn-primary" onClick={() => {
                setToast(true);
                setTimeout(() => setToast(false), 2600);
              }}>
                <Icon name="check" size={14} stroke={2.5} />
                Save preferences
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast show={toast} />
    </div>
  );
}

Object.assign(window, { Profile });
