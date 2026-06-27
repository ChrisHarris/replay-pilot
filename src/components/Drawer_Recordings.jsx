import { useEffect, useMemo, useRef, useState } from "react";
import { defaultCapture } from "../lib/projectDefaults.js";
import { getRecordingUrl, getRuns } from "../lib/projectsClient.js";

function formatRunTime(value) {
  if (!value) return "Recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function sourceType(url) {
  return url.endsWith(".webm") ? "video/webm" : "video/mp4";
}

function uniqueSources(run) {
  const orderedUrls = run.status === "passed"
    ? [run.mp4Url, run.videoUrl]
    : [run.videoUrl, run.mp4Url];

  return orderedUrls
    .filter(Boolean)
    .filter((url, index, urls) => urls.indexOf(url) === index)
    .map((url) => ({
      url: getRecordingUrl(url),
      type: sourceType(url)
    }));
}

function PreviousVideoSlide({ project, run }) {
  const videoRef = useRef(null);
  const width = Number(run.viewport?.width || project?.capture?.width || defaultCapture.width);
  const height = Number(run.viewport?.height || project?.capture?.height || defaultCapture.height);
  const sources = uniqueSources(run);
  const poster = getRecordingUrl(run.screenshotUrl);
  const frameStyle = {
    "--previous-video-width": width,
    "--previous-video-height": height
  };

  useEffect(() => {
    let cancelled = false;

    async function resetVideoAspectRatio() {
      await customElements.whenDefined("wa-video");
      await videoRef.current?.updateComplete;
      if (cancelled) return;

      const wrapper = videoRef.current?.shadowRoot?.querySelector(".video-wrapper");
      if (wrapper) wrapper.style.aspectRatio = "auto";
    }

    resetVideoAspectRatio();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <wa-carousel-item class="previous-video-item" style={frameStyle}>
      <div className="previous-video-slide">
        <div className="previous-video-frame">
          {sources.length ? (
            <wa-video ref={videoRef} class="previous-video" controls="full" poster={poster}>
              {sources.map((source) => (
                <source src={source.url} type={source.type} key={source.url} />
              ))}
            </wa-video>
          ) : (
            <div className="previous-video-empty">Recording unavailable</div>
          )}
        </div>
        <div className="previous-video-meta">
          <span>{formatRunTime(run.finishedAt)}</span>
          <wa-badge variant={run.status === "passed" ? "success" : "danger"} appearance="filled">
            {run.status}
          </wa-badge>
        </div>
      </div>
    </wa-carousel-item>
  );
}

export default function Drawer_Recordings({ project, scenario, onCancel }) {
  const [state, setState] = useState({ status: "loading", runs: [], message: "" });
  const title = useMemo(
    () => scenario?.name || project?.name || "recordings",
    [project?.name, scenario?.name]
  );
  const captureWidth = Number(project?.capture?.width || defaultCapture.width);
  const captureHeight = Number(project?.capture?.height || defaultCapture.height);
  const carouselStyle = {
    "--previous-video-width": captureWidth,
    "--previous-video-height": captureHeight,
    "--aspect-ratio": `${captureWidth} / ${captureHeight}`
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      if (!project?.id) {
        setState({ status: "empty", runs: [], message: "Choose a project to browse recordings." });
        return;
      }

      try {
        setState({ status: "loading", runs: [], message: "" });
        const body = await getRuns(project.id, scenario?.id);
        if (cancelled) return;

        const runs = [...(body.runs || [])].sort((a, b) => (
          String(b.finishedAt || b.id).localeCompare(String(a.finishedAt || a.id))
        ));
        setState({
          status: runs.length ? "ready" : "empty",
          runs,
          message: runs.length ? "" : `No recordings yet for ${title}.`
        });
      } catch (error) {
        if (cancelled) return;
        setState({ status: "error", runs: [], message: error.message });
      }
    }

    loadRuns();

    return () => {
      cancelled = true;
    };
  }, [project?.id, scenario?.id, title]);

  return (
    <>
      <div className="drawer-body previous-videos-body">
        {state.status === "loading" ? (
          <div className="previous-video-state">
            <wa-icon name="spinner" variant="solid" aria-hidden="true"></wa-icon>
            Loading recordings
          </div>
        ) : null}

        {state.status === "ready" ? (
          <wa-carousel class="previous-videos-carousel" navigation pagination mouse-dragging style={carouselStyle}>
            {state.runs.map((run) => (
              <PreviousVideoSlide project={project} run={run} key={run.id} />
            ))}
          </wa-carousel>
        ) : null}

        {state.status === "empty" || state.status === "error" ? (
          <div className="previous-video-state">
            <wa-icon
              name={state.status === "error" ? "circle-exclamation" : "rectangle-vertical-history"}
              variant="solid"
              aria-hidden="true"
            ></wa-icon>
            {state.message}
          </div>
        ) : null}
      </div>
      <div slot="footer" className="drawer-actions">
        <wa-button size="m" variant="neutral" pill appearance="filled" onClick={onCancel}>
          <wa-icon slot="start" name="circle-xmark" variant="solid" aria-hidden="true"></wa-icon>
          Close
        </wa-button>
      </div>
    </>
  );
}
