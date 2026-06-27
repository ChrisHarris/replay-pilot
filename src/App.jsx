import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Drawer_Edit from "./components/Drawer_Edit.jsx";
import Drawer_Project from "./components/Drawer_Project.jsx";
import Drawer_Recordings from "./components/Drawer_Recordings.jsx";
import Drawer_Shell from "./components/Drawer_Shell.jsx";
import Layout_Header from "./components/Layout_Header.jsx";
import Layout_Navigation from "./components/Layout_Navigation.jsx";
import Layout_Main from "./components/Layout_Main.jsx";
import { cancelRun, getPlaywrightStatus, getProjects, removeProject, runScenario, savePreferences, saveProject, saveScenario } from "./lib/projectsClient.js";

export default function App() {
  const setupDialogRef = useRef(null);
  const toastRef = useRef(null);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeScenarioId, setActiveScenarioId] = useState("");
  const [drawer, setDrawer] = useState({ type: "", project: null, scenario: null });
  const [status, setStatus] = useState({ state: "loading", message: "Loading projects..." });
  const [playwrightStatus, setPlaywrightStatus] = useState(null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [activeProjectId, projects]
  );

  const activeScenario = useMemo(
    () => activeProject?.scenarios?.find((scenario) => scenario.id === activeScenarioId) || null,
    [activeProject, activeScenarioId]
  );

  function getInitialSelection(projects, preferences = {}) {
    const preferredProject = projects.find((project) => project.id === preferences.projectId);
    const preferredScenario = preferredProject?.scenarios?.find((scenario) => scenario.id === preferences.scenarioId);
    if (preferredProject && preferredScenario) {
      return { projectId: preferredProject.id, scenarioId: preferredScenario.id };
    }

    const firstProject = projects[0];
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

    try {
      setStatus({ state: "saving", message: "Removing project..." });
      const body = await removeProject(project.id);
      const selection = getInitialSelection(body.projects || [], body.preferences);
      setProjects(body.projects || []);
      setActiveProjectId(selection.projectId);
      setActiveScenarioId(selection.scenarioId);
      setStatus({ state: "ready", message: "" });
    } catch (error) {
      setStatus({ state: "error", message: error.message });
      refreshProjects();
    }
  }

  async function handleScenarioSave(scenario) {
    if (!drawer.project?.id) return;

    try {
      setStatus({ state: "saving", message: "Saving scenario..." });
      const body = await saveScenario(drawer.project.id, scenario);
      const selection = getInitialSelection(body.projects || [], body.preferences || {
        projectId: drawer.project.id,
        scenarioId: body.scenario?.id
      });
      setProjects(body.projects || []);
      setActiveProjectId(selection.projectId);
      setActiveScenarioId(selection.scenarioId);
      setStatus({ state: "ready", message: "" });
      closeDrawer();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  async function handleRunScenario() {
    if (!activeProject?.id || !activeScenario?.id) return;
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

    try {
      await savePreferences({ projectId, scenarioId });
    } catch {
      // Selection should still work when the local API is unavailable.
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
  const statusToastIcon = status.state === "error"
    ? "circle-exclamation"
    : statusIsBusy
      ? "circle-notch"
      : "circle-check";

  useEffect(() => {
    let cancelled = false;

    async function showStatusToast() {
      if (!status.message) return;

      await customElements.whenDefined("wa-toast");
      if (cancelled || !toastRef.current) return;

      const toastItem = await toastRef.current.create(status.message, {
        duration: status.showVideo ? 10000 : status.state === "error" ? 7000 : 5000,
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
      if (statusIsBusy) icon.animation = "spin";
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
    };
  }, [status.message, status.showVideo, status.state, statusIsBusy, statusToastIcon, statusToastVariant]);

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
          runIsRunning={status.state === "running" || status.state === "cancelling"}
          scenario={activeScenario}
          onRun={handleRunScenario}
          onRecordings={() => openDrawer({ type: "recordings", project: activeProject, scenario: activeScenario })}
          onEdit={() => openDrawer({ type: "edit", project: activeProject, scenario: activeScenario })}
        />
      </wa-page>

      <wa-toast ref={toastRef} class="status-toast" placement="top-end"></wa-toast>

      <Drawer_Shell open={Boolean(drawer.type)} label={drawerLabel} onClose={closeDrawer}>
        {drawer.type === "project" ? (
          <Drawer_Project project={drawer.project} onCancel={closeDrawer} onRemove={handleProjectRemove} onSave={handleProjectSave} />
        ) : null}
        {drawer.type === "scenario" || drawer.type === "edit" ? (
          <Drawer_Edit scenario={drawer.scenario} onCancel={closeDrawer} onSave={handleScenarioSave} />
        ) : null}
        {drawer.type === "recordings" ? (
          <Drawer_Recordings project={drawer.project} scenario={drawer.scenario} onCancel={closeDrawer} />
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
