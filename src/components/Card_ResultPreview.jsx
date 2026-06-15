export default function Card_ResultPreview({ status, error, onOpenArtifacts }) {
  const message = error || status?.message || "No run has started yet.";
  const result = status?.result;

  return (
    <wa-card className="surface-card compact-card">
      <div slot="header" className="card-header">
        <div>
          <p className="eyebrow">Output</p>
          <h2>Result preview</h2>
        </div>
        <wa-badge variant={status?.state === "failed" || error ? "danger" : status?.state === "finished" ? "success" : "neutral"} appearance="outlined">
          {error ? "error" : status?.state || "idle"}
        </wa-badge>
      </div>

      <div className="result-box">
        <p>{message}</p>
        {result && (
          <dl>
            <div>
              <dt>Exit code</dt>
              <dd>{result.exitCode}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{result.durationMs} ms</dd>
            </div>
          </dl>
        )}
      </div>

      <div slot="footer" className="card-actions">
        <wa-button appearance="outlined" variant="brand" onClick={onOpenArtifacts}>
          Open artifacts
        </wa-button>
      </div>
    </wa-card>
  );
}
