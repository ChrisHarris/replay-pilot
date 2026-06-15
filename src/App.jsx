import { useEffect, useMemo, useRef, useState } from "react";
import Card_RunSettings from "./components/Card_RunSettings.jsx";
import Card_RunnerStatus from "./components/Card_RunnerStatus.jsx";
import Card_ScenarioLibrary from "./components/Card_ScenarioLibrary.jsx";
import Card_ResultPreview from "./components/Card_ResultPreview.jsx";
import Drawer_AppProfile from "./components/Drawer_AppProfile.jsx";
import Drawer_RunLog from "./components/Drawer_RunLog.jsx";
import Drawer_Artifacts from "./components/Drawer_Artifacts.jsx";
import { appProfiles, scenarioPacks } from "./data/scenarios.js";
import { getSavedRunnerUrl, getStatus, saveRunnerUrl, startRun } from "./lib/runnerClient.js";

export default function App() {
  const profileDrawerRef = useRef(null);
  const logDrawerRef = useRef(null);
  const artifactsDrawerRef = useRef(null);
  const [profiles, setProfiles] = useState(appProfiles);
  const [activeProfileId, setActiveProfileId] = useState(appProfiles[0].id);
  const [runnerUrl, setRunnerUrl] = useState(getSavedRunnerUrl());
  const [runner, setRunner] = useState({ available: false, checking: true, status: { state: "idle", log: [] } });
  const [runError, setRunError] = useState("");

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) || profiles[0],
    [activeProfileId, profiles]
  );

  async function refreshStatus() {
    try {
      const body = await getStatus();
      setRunner({ available: true, checking: false, status: body.status });
      setRunError("");
    } catch (error) {
      setRunner((current) => ({
        ...current,
        available: false,
        checking: false
      }));
      setRunError(error.message);
    }
  }

  useEffect(() => {
    refreshStatus();
    const interval = window.setInterval(refreshStatus, 1500);
    return () => window.clearInterval(interval);
  }, [runnerUrl]);

  function handleRunnerUrlChange(nextUrl) {
    saveRunnerUrl(nextUrl);
    setRunnerUrl(nextUrl);
  }

  function handleProfileSave(nextProfile) {
    setProfiles((current) => current.map((profile) => profile.id === nextProfile.id ? nextProfile : profile));
    profileDrawerRef.current.open = false;
  }

  async function handleRun(settings) {
    try {
      setRunError("");
      const body = await startRun(settings);
      setRunner({ available: true, checking: false, status: body.status });
    } catch (error) {
      setRunError(error.message);
    }
  }

  const activePack = scenarioPacks.find((pack) => pack.id === activeProfile.scenarioPack) || scenarioPacks[0];

  return (
    <>
      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Local automation cockpit</p>
            <h1>ReplayPilot</h1>
          </div>
          <div className="header-actions">
            <wa-badge variant={runner.available ? "success" : "warning"} appearance="outlined">
              {runner.checking ? "Checking runner" : runner.available ? "Runner connected" : "Runner offline"}
            </wa-badge>
            <wa-button appearance="outlined" variant="brand" onClick={() => { profileDrawerRef.current.open = true; }}>
              Edit profile
              <wa-icon slot="end" name="pen-to-square"></wa-icon>
            </wa-button>
          </div>
        </header>

        <section className="page-grid">
          <div className="main-column">
            <Card_RunSettings
              profile={activeProfile}
              profiles={profiles}
              scenarioPacks={scenarioPacks}
              onProfileChange={setActiveProfileId}
              onRun={handleRun}
              running={runner.status.state === "running"}
            />
            <Card_ScenarioLibrary scenarioPacks={scenarioPacks} activePack={activePack} />
          </div>
          <div className="side-column">
            <Card_RunnerStatus
              runner={runner}
              runnerUrl={runnerUrl}
              onRunnerUrlChange={handleRunnerUrlChange}
              onOpenLog={() => { logDrawerRef.current.open = true; }}
            />
            <Card_ResultPreview
              status={runner.status}
              error={runError}
              onOpenArtifacts={() => { artifactsDrawerRef.current.open = true; }}
            />
          </div>
        </section>
      </main>

      <Drawer_AppProfile
        ref={profileDrawerRef}
        profile={activeProfile}
        scenarioPacks={scenarioPacks}
        onSave={handleProfileSave}
      />
      <Drawer_RunLog ref={logDrawerRef} status={runner.status} />
      <Drawer_Artifacts ref={artifactsDrawerRef} status={runner.status} />
    </>
  );
}
