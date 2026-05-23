// Main app — tab switcher between the 6 screens

const { useState: useAppState, useEffect: useAppEffect } = React;

function App() {
  // Read initial screen from URL hash
  const initial = () => {
    const h = (window.location.hash || "").replace("#", "");
    return h || "landing";
  };
  const [screen, setScreen] = useAppState(initial());
  const [autoApply, setAutoApply] = useAppState(true);

  useAppEffect(() => {
    window.location.hash = screen;
  }, [screen]);

  useAppEffect(() => {
    const onHash = () => setScreen(initial());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const screens = [
    { id: "landing", label: "Landing" },
    { id: "feed", label: "Feed" },
    { id: "generation", label: "Generation" },
    { id: "diff", label: "Diff" },
    { id: "applications", label: "Applications" },
    { id: "profile", label: "Profile" },
    { id: "settings", label: "Settings" },
  ];

  const goNav = (id) => setScreen(id);

  return (
    <div data-screen-label={screen}>
      {screen === "landing" && <Landing goApp={() => setScreen("feed")} />}
      {screen === "feed" && <Feed goNav={goNav} autoApply={autoApply} setAutoApply={setAutoApply} onOpenJob={() => setScreen("generation")} />}
      {screen === "generation" && <Generation goNav={goNav} autoApply={autoApply} setAutoApply={setAutoApply} onShowDiff={() => setScreen("diff")} onConfirm={() => setScreen("applications")} />}
      {screen === "diff" && <CvDiff goNav={goNav} autoApply={autoApply} setAutoApply={setAutoApply} onHideDiff={() => setScreen("generation")} onConfirm={() => setScreen("applications")} />}
      {screen === "applications" && <Applications goNav={goNav} autoApply={autoApply} setAutoApply={setAutoApply} />}
      {screen === "profile" && <Profile goNav={goNav} autoApply={autoApply} setAutoApply={setAutoApply} />}
      {screen === "settings" && <Settings goNav={goNav} autoApply={autoApply} setAutoApply={setAutoApply} />}

      {/* Screen picker */}
      <div className="screen-picker">
        {screens.map((s, i) => (
          <button key={s.id}
                  className={screen === s.id ? "active" : ""}
                  onClick={() => setScreen(s.id)}>
            <span className="num">{String(i + 1).padStart(2, "0")}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
