import { forwardRef } from "react";

const Drawer_Artifacts = forwardRef(function Drawer_Artifacts({ status }, ref) {
  const artifacts = status?.artifacts || [];

  return (
    <wa-drawer ref={ref} label="Artifacts" placement="end" className="app-drawer">
      <div className="artifact-list">
        {artifacts.length === 0 ? (
          <p className="muted">Artifacts from the latest run will appear here.</p>
        ) : artifacts.map((artifact) => (
          <a key={artifact.path} href={artifact.url} target="_blank" rel="noreferrer">
            {artifact.name}
          </a>
        ))}
      </div>
    </wa-drawer>
  );
});

export default Drawer_Artifacts;
