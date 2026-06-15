import { useRef } from "react";

export default function Card_RunnerStatus({ runner, runnerUrl, onRunnerUrlChange, onOpenLog }) {
  const runnerUrlRef = useRef(null);
  const state = runner.status?.state || "idle";

  return (
    <wa-card className="surface-card compact-card">
      <div slot="header" className="card-header">
        <div>
          <p className="eyebrow">Bridge</p>
          <h2>Runner status</h2>
        </div>
        <wa-badge variant={runner.available ? "success" : "warning"} appearance="outlined">
          {runner.available ? state : "offline"}
        </wa-badge>
      </div>

      <div className="form-stack">
        <wa-input ref={runnerUrlRef} label="Runner API URL" value={runnerUrl}></wa-input>
        <wa-callout variant={runner.available ? "success" : "warning"} appearance="outlined">
          <wa-icon slot="icon" name={runner.available ? "circle-check" : "triangle-exclamation"}></wa-icon>
          {runner.available ? "Local runner is accepting jobs." : "Start the runner locally with npm run runner."}
        </wa-callout>
      </div>

      <div slot="footer" className="card-actions">
        <wa-button appearance="outlined" variant="brand" onClick={() => onRunnerUrlChange(runnerUrlRef.current?.value)}>
          Save URL
        </wa-button>
        <wa-button appearance="plain" variant="neutral" onClick={onOpenLog}>
          View log
        </wa-button>
      </div>
    </wa-card>
  );
}
