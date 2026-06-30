import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCapture } from "../lib/projectDefaults.js";
import { getInstructionDisplayTree, getInstructionPresentation, parseInstructionTree } from "../lib/instructionTree.js";
import { getEmitInteractionsUrl, getLivePreviewEventsUrl, getLivePreviewUrl } from "../lib/projectsClient.js";
import {
  EMIT_INTERACTIONS_HOST_SOURCE,
  EMIT_INTERACTIONS_PROTOCOL_VERSION,
  isEmitInteractionsMessage
} from "../lib/emitInteractions.js";

export { parseInstructionTree } from "../lib/instructionTree.js";

function InstructionTreeItem({ node, depth = 0 }) {
  const presentation = getInstructionPresentation(node.text, depth);
  const stepIndex = Number.isInteger(node.stepIndex) ? node.stepIndex : undefined;

  return (
    <wa-tree-item expanded={true} data-step-index={stepIndex} style={{ color: presentation.color }}>
      {presentation.icon && node.children.length > 0
        ? ["expand-icon", "collapse-icon"].map((slot) => (
            <wa-icon
              key={slot}
              slot={slot}
              name={presentation.icon}
              variant="solid"
              rotate={presentation.rotate}
              aria-hidden="true"
            ></wa-icon>
          ))
        : null}
      <span>{node.text}</span>
      {node.children.map((child, index) => (
        <InstructionTreeItem node={child} depth={depth + 1} key={`${child.text}-${index}`} />
      ))}
    </wa-tree-item>
  );
}

export default function Layout_Main({
  onEdit,
  onEmitterPaused,
  onEmitterReady,
  onInteraction,
  onRecordings,
  onRun,
  onToggleInteractionEmission,
  project,
  emissionState = "idle",
  emissionSessionId = "",
  runIsRunning = false,
  scenario
}) {
  const instructionTreeRef = useRef(null);
  const projectFrameRef = useRef(null);
  const [activeRunStep, setActiveRunStep] = useState(null);
  const instructionTree = useMemo(
    () => getInstructionDisplayTree(scenario?.instructions),
    [scenario?.instructions]
  );
  const instructionTreeKey = `${scenario?.id || "scenario"}:${scenario?.instructions || ""}`;
  const captureWidth = Number(project?.capture?.width || defaultCapture.width);
  const captureHeight = Number(project?.capture?.height || defaultCapture.height);
  const captureAspectRatio = Number((captureWidth / captureHeight).toFixed(6));
  const frameStyle = {
    "--project-frame-width": captureWidth,
    "--project-frame-height": captureHeight
  };
  const projectUrl = project?.url || "";
  const frameUrl = runIsRunning ? getLivePreviewUrl() : projectUrl;
  const emissionIsActive = emissionState === "active";

  useEffect(() => {
    if (!runIsRunning) {
      setActiveRunStep(null);
      return undefined;
    }

    const events = new EventSource(getLivePreviewEventsUrl());
    const handleAction = (event) => {
      try {
        const action = JSON.parse(event.data);
        if (Number.isInteger(action.index)) setActiveRunStep(action.index);
      } catch {
        // Ignore malformed progress events and keep the last valid action selected.
      }
    };
    const handleFinished = () => setActiveRunStep(null);

    events.addEventListener("action", handleAction);
    events.addEventListener("finished", handleFinished);

    return () => {
      events.removeEventListener("action", handleAction);
      events.removeEventListener("finished", handleFinished);
      events.close();
      setActiveRunStep(null);
    };
  }, [runIsRunning, scenario?.id]);

  useEffect(() => {
    let cancelled = false;

    async function selectActiveInstruction() {
      await customElements.whenDefined("wa-tree-item");
      await instructionTreeRef.current?.updateComplete;
      if (cancelled || !instructionTreeRef.current) return;

      instructionTreeRef.current.querySelectorAll("wa-tree-item").forEach((item) => {
        const selected = Number(item.dataset.stepIndex) === activeRunStep;
        item.selected = selected;
        item.toggleAttribute("selected", selected);
      });
    }

    selectActiveInstruction();

    return () => {
      cancelled = true;
    };
  }, [activeRunStep, instructionTreeKey]);

  useEffect(() => {
    let cancelled = false;

    async function expandInstructionTreeItems() {
      await customElements.whenDefined("wa-tree-item");
      await instructionTreeRef.current?.updateComplete;
      if (cancelled || !instructionTreeRef.current) return;

      instructionTreeRef.current.querySelectorAll("wa-tree-item").forEach((item) => {
        item.expanded = true;
        item.setAttribute("expanded", "");
      });
    }

    expandInstructionTreeItems();
    const frame = requestAnimationFrame(expandInstructionTreeItems);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [instructionTreeKey]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver;
    let resizeFrame;

    async function fitProjectFrame() {
      await customElements.whenDefined("wa-zoomable-frame");
      await projectFrameRef.current?.updateComplete;
      if (cancelled || !projectFrameRef.current) return;

      const frame = projectFrameRef.current;
      const updateZoom = () => {
        const bounds = frame.getBoundingClientRect();
        const sourceAspectRatio = Number(frame.dataset.aspectRatio);
        const sourceWidth = Number(frame.dataset.frameWidth);
        const sourceHeight = Number(frame.dataset.frameHeight);

        if (!bounds.width || !bounds.height || !sourceAspectRatio || !sourceWidth || !sourceHeight) return;

        const widthIsLimiting = bounds.width / bounds.height <= sourceAspectRatio;
        const nextZoom = Math.min(
          1,
          widthIsLimiting ? bounds.width / sourceWidth : bounds.height / sourceHeight
        );

        frame.zoom = Number(nextZoom.toFixed(6));
      };

      resizeObserver = new ResizeObserver(updateZoom);
      resizeObserver.observe(frame);
      resizeFrame = requestAnimationFrame(updateZoom);
    }

    fitProjectFrame();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      cancelAnimationFrame(resizeFrame);
    };
  }, [captureHeight, captureWidth, runIsRunning]);

  useEffect(() => {
    if (!emissionSessionId || runIsRunning) return;

    const frame = projectFrameRef.current;
    if (!frame) return;
    let retryTimer;

    let expectedOrigin = "*";
    try {
      expectedOrigin = new URL(projectUrl, window.location.href).origin;
    } catch {
      // postMessage accepts a wildcard when a project URL cannot be normalised.
    }

    function sendCommand() {
      const contentWindow = frame.contentWindow;
      if (!contentWindow) return;
      contentWindow.postMessage({
        source: EMIT_INTERACTIONS_HOST_SOURCE,
        version: EMIT_INTERACTIONS_PROTOCOL_VERSION,
        type: emissionIsActive ? "enable" : "pause",
        sessionId: emissionSessionId
      }, expectedOrigin);
    }

    function installSameOriginBridge() {
      try {
        const document = frame.contentDocument;
        if (!document || document.querySelector("script[data-emit-interactions]")) return;
        const script = document.createElement("script");
        script.src = getEmitInteractionsUrl();
        script.defer = true;
        script.dataset.emitInteractions = "";
        script.addEventListener("load", sendCommand, { once: true });
        (document.head || document.documentElement).append(script);
      } catch {
        // Cross-origin projects opt in with the bridge script in their base HTML.
      }
    }

    function handleMessage(event) {
      if (event.source !== frame.contentWindow || !isEmitInteractionsMessage(event.data)) return;
      if (expectedOrigin !== "*" && event.origin !== expectedOrigin) return;
      if (event.data.type === "available") {
        sendCommand();
        return;
      }
      if (event.data.sessionId !== emissionSessionId) return;
      if (event.data.type === "ready") {
        window.clearTimeout(retryTimer);
        onEmitterReady?.(true);
      } else if (event.data.type === "paused") {
        window.clearTimeout(retryTimer);
        onEmitterPaused?.();
      } else if (event.data.type === "interaction" && event.data.interaction) {
        onInteraction?.(event.data.interaction);
      }
    }

    function handleFrameLoad() {
      installSameOriginBridge();
      sendCommand();
    }

    window.addEventListener("message", handleMessage);
    frame.addEventListener("load", handleFrameLoad);
    installSameOriginBridge();
    sendCommand();
    retryTimer = window.setTimeout(sendCommand, 350);

    return () => {
      window.removeEventListener("message", handleMessage);
      frame.removeEventListener("load", handleFrameLoad);
      window.clearTimeout(retryTimer);
    };
  }, [emissionIsActive, emissionSessionId, onEmitterPaused, onEmitterReady, onInteraction, projectUrl, runIsRunning]);

  return (
    <main className="app-main" aria-label="Scenario workspace">
      {scenario ? (
        <>
          <div className="header-bar">
            <h3>{scenario.name}</h3>
          </div>

          <div className="capture-area">
            <wa-zoomable-frame
              ref={projectFrameRef}
              key={runIsRunning ? "live-preview" : "project-preview"}
              class="project-frame"
              src={frameUrl}
              style={frameStyle}
              data-aspect-ratio={captureAspectRatio}
              data-frame-width={captureWidth}
              data-frame-height={captureHeight}
              data-live-preview={runIsRunning ? "true" : "false"}
              without-controls
              without-interaction={runIsRunning || undefined}
            ></wa-zoomable-frame>
          </div>

          <wa-scroller class="scenario-description" orientation="vertical">
            <wa-tree ref={instructionTreeRef} key={instructionTreeKey} style={{ "--indent-guide-width": "1px" }}>
              {instructionTree.map((node, index) => (
                <InstructionTreeItem node={node} key={`${node.text}-${index}`} />
              ))}
            </wa-tree>
          </wa-scroller>

          <div className="action-bar">
            <wa-button appearance="filled" variant={emissionIsActive ? "success" : "neutral"} class="action" size="s" pill disabled={runIsRunning || undefined} onClick={onToggleInteractionEmission}>
              <wa-icon slot="start" name={emissionIsActive ? "pause" : "circle-dot"} variant="solid" aria-hidden="true"></wa-icon>
              {emissionIsActive ? "Pause" : "Record"}
            </wa-button>
            <wa-button appearance="accent" class="action" size="s" pill disabled={emissionIsActive || undefined} onClick={onRun}>
              <wa-icon slot="start" name={runIsRunning ? "pause" : "play"} variant="solid" aria-hidden="true"></wa-icon>
              {runIsRunning ? "Pause" : "Run"}
            </wa-button>
            <wa-button appearance="filled" class="action" size="s" pill data-drawer="open recordings-drawer" onClick={onRecordings}>
              <wa-icon slot="start" name="rectangle-vertical-history" variant="solid" aria-hidden="true" style={{ transform: "scaleX(-1)" }}></wa-icon>
              Recordings
            </wa-button>
            <wa-button appearance="filled" class="action" size="s" pill data-drawer="open edit-drawer" onClick={onEdit}>
              <wa-icon slot="start" name="pen-to-square" variant="solid" aria-hidden="true"></wa-icon>
              Edit
            </wa-button>
          </div>
        </>
      ) : null}
    </main>
  );
}
