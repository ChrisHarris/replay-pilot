import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Drawer_Edit, { SCENARIO_SAVE_ICON } from "./components/Drawer_Edit.jsx";
import Drawer_Project from "./components/Drawer_Project.jsx";
import Drawer_Recordings from "./components/Drawer_Recordings.jsx";
import Drawer_Shell from "./components/Drawer_Shell.jsx";
import Layout_Header from "./components/Layout_Header.jsx";
import Layout_Navigation from "./components/Layout_Navigation.jsx";
import Layout_Main from "./components/Layout_Main.jsx";
import { cancelRun, getPlaywrightStatus, getProjects, removeProject, removeScenario, runScenario, savePreferences, saveProject, saveScenario } from "./lib/projectsClient.js";
import { createEmitInteractionsSession } from "./lib/emitInteractions.js";
import { interactionsToInstructions, updateCapturedInteractions } from "./lib/interactionInstructions.js";
import { instructionsToPlaywrightScript } from "./lib/instructionScript.js";
import releaseNotes from "../release-notes.md?raw";

const TOAST_DURATION = 1500;

export default function App() {
  const setupDialogRef = useRef(null);
  const toastRef = useRef(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeScenarioId, setActiveScenarioId] = useState("");
  const [preferences, setPreferences] = useState({ projectId: "", scenarioId: "", subtitles: true });
  const [drawer, setDrawer] = useState({ type: "", project: null, scenario: null });
  const [status, setStatus] = useState({ state: "loading", message: "Loading projects..." });
  const [playwrightStatus, setPlaywrightStatus] = useState(null);
  const [emissionSession, setEmissionSession] = useState({
    state: "idle",
    sessionId: "",
    projectId: "",
    scenarioId: "",
    bridgeReady: false,
    bridgePaused: false,
    interactions: []
  });

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [activeProjectId, projects]
  );

  const activeScenario = useMemo(
    () => activeProject?.scenarios?.find((scenario) => scenario.id === activeScenarioId) || null,
    [activeProject, activeScenarioId]
  );

  const emissionMatchesSelection = emissionSession.projectId === activeProjectId
    && emissionSession.scenarioId === activeScenarioId;
  const activeScenarioDraft = useMemo(
    () => emissionMatchesSelection && activeScenario
      ? { ...activeScenario, instructions: interactionsToInstructions(emissionSession.interactions, activeProject?.url) }
      : activeScenario,
    [activeProject?.url, activeScenario, emissionMatchesSelection, emissionSession.interactions]
  );

  function getInitialSelection(projects, preferences = {}) {
    const preferredProject = projects.find((project) => project.id === preferences.projectId);
    const preferredScenario = preferredProject?.scenarios?.find((scenario) => scenario.id === preferences.scenarioId);
    if (preferredProject && preferredScenario) {
      return { projectId: preferredProject.id, scenarioId: preferredScenario.id };
    }

    const firstProject = projects.find((project) => project.scenarios?.length);
    const firstScenario = firstProject?.scenarios?.[0];
    return {
      projectId: firstProject?.id || "",
      scenarioId: firstScenario?.id || ""
    };
  }

  async function refreshProjects({ selectProjectId, selectScenarioId } = {}) {
    try {
      const body = await getProjects();
      const nextProjects = body.projects || [];
      const selection = selectProjectId !== undefined || selectScenarioId !== undefined
        ? { projectId: selectProjectId || "", scenarioId: selectScenarioId || "" }
        : getInitialSelection(nextProjects, body.preferences);

      setProjects(nextProjects);
      setActiveProjectId(selection.projectId);
      setActiveScenarioId(selection.scenarioId);
      setPreferences({
        ...body.preferences,
        ...selection,
        subtitles: body.preferences?.subtitles !== false
      });
      setStatus({ state: "ready", message: "" });
    } catch (error) {
      const videoUrl = error.body?.run?.videoUrl;
      setStatus({
        state: "error",
        message: videoUrl ? `${error.message} Recording saved.` : error.message,
        showVideo: Boolean(videoUrl)
      });
    }
  }

  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    async function checkPlaywright() {
      try {
        const body = await getPlaywrightStatus();
        const nextStatus = body.playwright || null;
        setPlaywrightStatus(nextStatus);

        if (nextStatus && !nextStatus.ok) {
          await customElements.whenDefined("wa-dialog");
          if (setupDialogRef.current) setupDialogRef.current.open = true;
        }
      } catch {
        // The browser install check is only available when the local runner API is running.
      }
    }

    checkPlaywright();
  }, []);

  function closeDrawer() {
    setDrawer({ type: "", project: null, scenario: null });
  }

  function openDrawer(nextDrawer) {
    const page = document.querySelector("wa-page");
    const navigationIsOpen = page?.getAttribute("view") === "mobile" && (page.navOpen || page.navigationDrawer?.open);
    if (navigationIsOpen) page.hideNavigation?.();

    const delay = navigationIsOpen ? 350 : 0;
    const applyDrawer = () => flushSync(() => setDrawer(nextDrawer));
    window.setTimeout(applyDrawer, delay);
  }

  async function handleProjectSave(project) {
    try {
      setStatus({ state: "saving", message: "Saving project..." });
      const body = await saveProject(project);
      const savedProject = body.project;
      const selection = getInitialSelection(body.projects || [], body.preferences || {
        projectId: savedProject.id,
        scenarioId: savedProject.scenarios?.[0]?.id
      });
      setProjects(body.projects || []);
      setActiveProjectId(selection.projectId);
      setActiveScenarioId(selection.scenarioId);
      if (body.preferences) setPreferences(body.preferences);
      setStatus({ state: "ready", message: "" });
      closeDrawer();
    } catch (error) {
      const videoUrl = error.body?.run?.videoUrl;
      setStatus({
        state: "error",
        message: videoUrl ? `${error.message} Recording saved.` : error.message,
        showVideo: Boolean(videoUrl)
      });
    }
  }

  async function handleProjectRemove(project) {
    if (!project?.id) return;
    const nextProjects = projects.filter((item) => item.id !== project.id);
    const nextSelection = getInitialSelection(nextProjects);

    closeDrawer();
    setProjects(nextProjects);
    setActiveProjectId(nextSelection.projectId);
    setActiveScenarioId(nextSelection.scenarioId);
    setPreferences((current) => ({ ...current, ...nextSelection }));

    try {
      setStatus({ state: "saving", message: "Removing project..." });
      const body = await removeProject(project.id);
      const selection = getInitialSelection(body.projects || [], body.preferences);
      setProjects(body.projects || []);
      setActiveProjectId(selection.projectId);
      setActiveScenarioId(selection.scenarioId);
      if (body.preferences) setPreferences(body.preferences);
      setStatus({ state: "ready", message: "" });
    } catch (error) {
      setStatus({ state: "error", message: error.message });
      refreshProjects();
    }
  }

  async function handleScenarioSave(scenario) {
    if (!drawer.project?.id) return;

    try {
      setStatus({
        state: "saving",
        message: "Saving scenario...",
        icon: SCENARIO_SAVE_ICON,
        spin: false
      });
      const body = await saveScenario(drawer.project.id, scenario);
      const selection = getInitialSelection(body.projects || [], body.preferences || {
        projectId: drawer.project.id,
        scenarioId: body.scenario?.id
      });
      setProjects(body.projects || []);
      setActiveProjectId(selection.projectId);
      setActiveScenarioId(selection.scenarioId);
      if (body.preferences) setPreferences(body.preferences);
      setEmissionSession({
        state: "idle",
        sessionId: "",
        projectId: "",
        scenarioId: "",
        bridgeReady: false,
        bridgePaused: false,
        interactions: []
      });
      setStatus({ state: "ready", message: "" });
      closeDrawer();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  async function handleScenarioRemove(scenario) {
    const projectId = drawer.project?.id;
    if (!projectId || !scenario?.id) return;

    try {
      setStatus({ state: "saving", message: "Removing scenario..." });
      const body = await removeScenario(projectId, scenario.id);
      const selection = getInitialSelection(body.projects || [], body.preferences);
      setProjects(body.projects || []);
      setActiveProjectId(selection.projectId);
      setActiveScenarioId(selection.scenarioId);
      if (body.preferences) setPreferences(body.preferences);
      setEmissionSession({
        state: "idle",
        sessionId: "",
        projectId: "",
        scenarioId: "",
        bridgeReady: false,
        bridgePaused: false,
        interactions: []
      });
      closeDrawer();
      setStatus({ state: "ready", message: "Scenario removed." });
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  const handleInteraction = useCallback((interaction) => {
    console.log("[Emit Interactions]", interaction);
    setEmissionSession((current) => {
      if (!current.sessionId || !["active", "paused"].includes(current.state)) return current;
      return {
        ...current,
        interactions: updateCapturedInteractions(current.interactions, interaction)
      };
    });
  }, []);

  const handleEmitterReady = useCallback((bridgeReady) => {
    setEmissionSession((current) => current.sessionId ? { ...current, bridgeReady } : current);
    if (bridgeReady) {
      setStatus((current) => current.message?.startsWith("Emit Interactions bridge not detected")
        ? { state: "ready", message: "" }
        : current);
    }
  }, []);

  const handleEmitterPaused = useCallback(() => {
    setEmissionSession((current) => current.sessionId ? { ...current, bridgePaused: true } : current);
  }, []);

  function handleToggleInteractionEmission() {
    if (!activeProject?.id || !activeScenario?.id || status.state === "running" || status.state === "cancelling") return;

    if (emissionSession.state === "active" && emissionMatchesSelection) {
      setEmissionSession((current) => ({ ...current, state: "paused", bridgePaused: false }));
      return;
    }

    if (emissionSession.state === "paused" && emissionMatchesSelection) {
      setEmissionSession((current) => ({ ...current, state: "active", bridgeReady: false, bridgePaused: false }));
      return;
    }

    setEmissionSession(createEmitInteractionsSession(activeProject.id, activeScenario.id));
  }

  useEffect(() => {
    if (emissionSession.state !== "active" || emissionSession.bridgeReady) return;
    const timer = window.setTimeout(() => {
      setStatus({
        state: "error",
        message: "Emit Interactions bridge not detected. Add emit-interactions.js to the tested app."
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [emissionSession.bridgeReady, emissionSession.sessionId, emissionSession.state]);

  useEffect(() => {
    if (emissionSession.state !== "paused"
      || !emissionSession.bridgePaused
      || !emissionMatchesSelection
      || !activeProject?.id
      || !activeScenario) return;

    const instructions = interactionsToInstructions(emissionSession.interactions, activeProject.url);
    const nextScenario = {
      ...activeScenario,
      instructions,
      script: instructionsToPlaywrightScript(instructions)
    };

    setEmissionSession((current) => current.sessionId === emissionSession.sessionId
      ? { ...current, bridgePaused: false }
      : current);
    setStatus({
      state: "saving",
      message: "Saving captured instructions...",
      icon: SCENARIO_SAVE_ICON,
      spin: false
    });

    saveScenario(activeProject.id, nextScenario)
      .then((body) => {
        if (body.projects) setProjects(body.projects);
        setStatus({ state: "ready", message: "Captured instructions saved." });
      })
      .catch((error) => {
        setStatus({ state: "error", message: error.message });
      });
  }, [activeProject?.id, activeScenario, emissionMatchesSelection, emissionSession.bridgePaused, emissionSession.interactions, emissionSession.sessionId, emissionSession.state]);

  async function handleRunScenario() {
    if (!activeProject?.id || !activeScenario?.id) return;
    if (emissionSession.state === "active") return;
    if (status.state === "cancelling") return;

    if (status.state === "running") {
      try {
        setStatus({ state: "cancelling", message: "Stopping recording..." });
        const body = await cancelRun();
        setStatus({ state: "ready", message: body.message || "Recording cancelled." });
      } catch (error) {
        setStatus({ state: "error", message: error.message });
      }
      return;
    }

    try {
      setStatus({ state: "running", message: "Recording scenario..." });
      const body = await runScenario(activeProject.id, activeScenario.id);
      setStatus({
        state: "ready",
        message: body.run?.status === "cancelled"
          ? "Recording cancelled."
          : body.run?.videoUrl
            ? "Recording saved."
            : "Scenario run finished.",
        showVideo: body.run?.status !== "cancelled" && Boolean(body.run?.videoUrl)
      });
      if (body.projects) setProjects(body.projects);
    } catch (error) {
      const videoUrl = error.body?.run?.videoUrl;
      setStatus({
        state: error.body?.run?.status === "cancelled" ? "ready" : "error",
        message: error.body?.run?.status === "cancelled"
          ? "Recording cancelled."
          : videoUrl
            ? `${error.message} Recording saved.`
            : error.message,
        showVideo: error.body?.run?.status !== "cancelled" && Boolean(videoUrl)
      });
    }
  }

  async function handleSelectScenario(projectId, scenarioId) {
    setActiveProjectId(projectId);
    setActiveScenarioId(scenarioId);
    const nextPreferences = { ...preferences, projectId, scenarioId };
    setPreferences(nextPreferences);
    setEmissionSession({
      state: "idle",
      sessionId: "",
      projectId: "",
      scenarioId: "",
      bridgeReady: false,
      bridgePaused: false,
      interactions: []
    });

    try {
      const body = await savePreferences(nextPreferences);
      if (body.preferences) setPreferences(body.preferences);
    } catch {
      // Selection should still work when the local API is unavailable.
    }
  }

  async function handleSubtitlesChange(subtitles) {
    const previousPreferences = preferences;
    const nextPreferences = {
      ...preferences,
      projectId: activeProjectId,
      scenarioId: activeScenarioId,
      subtitles
    };
    setPreferences(nextPreferences);

    try {
      const body = await savePreferences(nextPreferences);
      if (body.preferences) setPreferences(body.preferences);
    } catch (error) {
      setPreferences(previousPreferences);
      setStatus({ state: "error", message: `Could not save subtitle preference: ${error.message}` });
    }
  }

  const drawerLabel = drawer.type === "project"
    ? drawer.project ? drawer.project.name : "New project"
    : drawer.type === "scenario"
      ? "New scenario"
      : drawer.type === "edit"
        ? "Edit"
        : drawer.type === "recordings"
            ? "Recordings"
            : "";
  const statusToastVariant = status.state === "error"
    ? "danger"
    : status.state === "running" || status.state === "saving" || status.state === "loading" || status.state === "cancelling"
      ? "brand"
      : "success";
  const statusIsBusy = status.state === "running" || status.state === "saving" || status.state === "loading" || status.state === "cancelling";
  const statusToastIcon = status.icon || (status.state === "error"
    ? "circle-exclamation"
    : statusIsBusy
      ? "circle-notch"
      : "circle-check");
  const statusToastIsPersistent = status.state === "running";

  useEffect(() => {
    let cancelled = false;
    let toastItem;

    async function showStatusToast() {
      if (!status.message) return;

      await customElements.whenDefined("wa-toast");
      if (cancelled || !toastRef.current) return;

      toastItem = await toastRef.current.create(status.message, {
        duration: statusToastIsPersistent ? 0 : TOAST_DURATION,
        variant: statusToastVariant
      });

      if (cancelled) {
        await toastItem.hide();
        return;
      }

      const icon = document.createElement("wa-icon");
      icon.slot = "icon";
      icon.name = statusToastIcon;
      icon.variant = "solid";
      if (statusIsBusy && status.spin !== false) icon.animation = "spin";
      toastItem.prepend(icon);

      if (status.showVideo) {
        const showVideoButton = document.createElement("wa-button");
        showVideoButton.className = "status-toast-action";
        showVideoButton.appearance = "accent";
        showVideoButton.size = "s";
        showVideoButton.textContent = "Show video";
        showVideoButton.addEventListener("click", () => {
          flushSync(() => setDrawer({ type: "recordings", project: activeProject, scenario: activeScenario }));
          toastItem.hide();
        });
        toastItem.append(showVideoButton);
      }
    }

    showStatusToast();

    return () => {
      cancelled = true;
      if (statusToastIsPersistent) toastItem?.hide();
    };
  }, [status.message, status.showVideo, status.spin, status.state, statusIsBusy, statusToastIcon, statusToastIsPersistent, statusToastVariant]);

  return (
    <>
      <wa-page mobile-breakpoint="900">
        <Layout_Header />
        <Layout_Navigation
          projects={projects}
          activeProjectId={activeProjectId}
          activeScenarioId={activeScenarioId}
          onCreateProject={() => openDrawer({ type: "project", project: null, scenario: null })}
          onEditProject={(project) => openDrawer({ type: "project", project, scenario: null })}
          onCreateScenario={(project) => openDrawer({ type: "scenario", project, scenario: null })}
          onSelectScenario={handleSelectScenario}
        />
        <Layout_Main
          project={activeProject}
          emissionState={emissionMatchesSelection ? emissionSession.state : "idle"}
          emissionSessionId={emissionMatchesSelection ? emissionSession.sessionId : ""}
          runIsRunning={status.state === "running" || status.state === "cancelling"}
          scenario={activeScenarioDraft}
          onToggleInteractionEmission={handleToggleInteractionEmission}
          onInteraction={handleInteraction}
          onEmitterPaused={handleEmitterPaused}
          onEmitterReady={handleEmitterReady}
          onRun={handleRunScenario}
          onRecordings={() => openDrawer({ type: "recordings", project: activeProject, scenario: activeScenario })}
          onEdit={() => openDrawer({ type: "edit", project: activeProject, scenario: activeScenarioDraft })}
        />
      </wa-page>

      <wa-toast ref={toastRef} class="status-toast" placement="top-end"></wa-toast>

      <wa-dialog id="release-notes-dialog" label="Release notes" class="release-notes-dialog">
        <wa-markdown>
          <script type="text/markdown">{releaseNotes}</script>
        </wa-markdown>
      </wa-dialog>

      <Drawer_Shell open={Boolean(drawer.type)} label={drawerLabel} onClose={closeDrawer}>
        {drawer.type === "project" ? (
          <Drawer_Project project={drawer.project} onCancel={closeDrawer} onRemove={handleProjectRemove} onSave={handleProjectSave} />
        ) : null}
        {drawer.type === "scenario" || drawer.type === "edit" ? (
          <Drawer_Edit scenario={drawer.scenario} onCancel={closeDrawer} onRemove={handleScenarioRemove} onSave={handleScenarioSave} />
        ) : null}
        {drawer.type === "recordings" ? (
          <Drawer_Recordings
            project={drawer.project}
            scenario={drawer.scenario}
            subtitlesEnabled={preferences.subtitles !== false}
            onSubtitlesChange={handleSubtitlesChange}
            onCancel={closeDrawer}
          />
        ) : null}
      </Drawer_Shell>

      <wa-dialog ref={setupDialogRef} label="Install recording tools" with-footer class="setup-dialog">
        <div className="setup-dialog-body">
          <p>Replay Pilot can load projects, but video recording needs Playwright Chromium and FFmpeg installed locally.</p>
          <p>Run this once from the project folder:</p>
          <code>{playwrightStatus?.command || "npm run setup:browsers"}</code>
          <p className="setup-dialog-note">After it finishes, restart Replay Pilot and run the scenario again.</p>
        </div>
        <wa-button slot="footer" appearance="filled" variant="brand" data-dialog="close">
          Close
        </wa-button>
      </wa-dialog>
    </>
  );
}
