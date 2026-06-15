import { useRef } from "react";

export default function Card_RunSettings({ profile, profiles, scenarioPacks, onProfileChange, onRun, running }) {
  const targetUrlRef = useRef(null);
  const scenarioPackRef = useRef(null);
  const widthRef = useRef(null);
  const heightRef = useRef(null);
  const videoRef = useRef(null);

  function readSettings() {
    return {
      profileId: profile.id,
      targetUrl: targetUrlRef.current?.value || profile.targetUrl,
      scenarioPack: scenarioPackRef.current?.value || profile.scenarioPack,
      viewportWidth: Number(widthRef.current?.value || profile.viewportWidth),
      viewportHeight: Number(heightRef.current?.value || profile.viewportHeight),
      recordVideo: videoRef.current?.checked ?? true
    };
  }

  return (
    <wa-card className="surface-card">
      <div slot="header" className="card-header">
        <div>
          <p className="eyebrow">Target</p>
          <h2>Run settings</h2>
        </div>
        <wa-select value={profile.id} size="small" onChange={(event) => onProfileChange(event.target.value)}>
          {profiles.map((item) => (
            <wa-option key={item.id} value={item.id}>{item.name}</wa-option>
          ))}
        </wa-select>
      </div>

      <div className="form-stack">
        <wa-input ref={targetUrlRef} label="Target app URL" value={profile.targetUrl}></wa-input>
        <wa-select ref={scenarioPackRef} label="Scenario pack" value={profile.scenarioPack}>
          {scenarioPacks.map((pack) => (
            <wa-option key={pack.id} value={pack.id}>{pack.name}</wa-option>
          ))}
        </wa-select>
        <div className="field-pair">
          <wa-number-input ref={widthRef} label="Viewport width" value={profile.viewportWidth} min="320" max="1920"></wa-number-input>
          <wa-number-input ref={heightRef} label="Viewport height" value={profile.viewportHeight} min="480" max="1600"></wa-number-input>
        </div>
        <div className="switch-line">
          <div>
            <strong>Record browser artifacts</strong>
            <p>Keep traces, screenshots, and videos when scenarios request them.</p>
          </div>
          <wa-switch ref={videoRef} checked></wa-switch>
        </div>
      </div>

      <div slot="footer" className="card-actions">
        <wa-button variant="brand" onClick={() => onRun(readSettings())} loading={running || undefined}>
          Start run
          <wa-icon slot="end" name="play"></wa-icon>
        </wa-button>
      </div>
    </wa-card>
  );
}
