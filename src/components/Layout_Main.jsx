import { useEffect, useMemo, useRef } from "react";
import { defaultCapture } from "../lib/projectDefaults.js";
import { normaliseInstructionIndent } from "../lib/instructionFormatting.js";
import { getLivePreviewUrl } from "../lib/projectsClient.js";

function normaliseInstructionText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function readInstructionLine(line, hasHeadingContext) {
  const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
  if (heading) {
    return {
      isHeading: true,
      level: 0,
      text: heading[1]
    };
  }

  const bullet = line.match(/^([\t ]*)[-*]\s+(.+)$/);
  if (bullet) {
    return {
      isHeading: false,
      level: normaliseInstructionIndent(bullet[1]).length + (hasHeadingContext ? 1 : 0),
      text: bullet[2]
    };
  }

  const textLine = line.match(/^([\t ]*)(.+)$/);
  return {
    isHeading: false,
    level: normaliseInstructionIndent(textLine?.[1] || "").length + (hasHeadingContext ? 1 : 0),
    text: textLine?.[2] || line
  };
}

export function parseInstructionTree(instructions = "") {
  const roots = [];
  const stack = [];
  let hasHeadingContext = false;

  for (const line of instructions.split("\n")) {
    if (!line.trim()) continue;

    const parsedLine = readInstructionLine(line, hasHeadingContext);
    const level = parsedLine.level;
    if (parsedLine.isHeading) {
      hasHeadingContext = true;
    }

    const node = { text: normaliseInstructionText(parsedLine.text), children: [] };
    if (!node.text) continue;

    while (stack.length > level) stack.pop();

    const parent = stack[level - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);

    stack[level] = node;
    stack.length = level + 1;
  }

  return roots;
}

function InstructionTreeItem({ node }) {
  return (
    <wa-tree-item expanded={true}>
      {node.text}
      {node.children.map((child, index) => (
        <InstructionTreeItem node={child} key={`${child.text}-${index}`} />
      ))}
    </wa-tree-item>
  );
}

export default function Layout_Main({ onEdit, onRecordings, onRun, project, runIsRunning = false, scenario }) {
  const instructionTreeRef = useRef(null);
  const projectFrameRef = useRef(null);
  const instructionTree = useMemo(
    () => parseInstructionTree(scenario?.instructions),
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

          <div className="scenario-description">
            <wa-tree ref={instructionTreeRef} key={instructionTreeKey} style={{ "--indent-guide-width": "1px" }}>
              {instructionTree.map((node, index) => (
                <InstructionTreeItem node={node} key={`${node.text}-${index}`} />
              ))}
            </wa-tree>
          </div>

          <div className="action-bar">
            <wa-button appearance="accent" class="action" size="s" pill onClick={onRun}>
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
