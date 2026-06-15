import { forwardRef } from "react";

const Drawer_RunLog = forwardRef(function Drawer_RunLog({ status }, ref) {
  const log = status?.log || [];

  return (
    <wa-drawer ref={ref} label="Run log" placement="end" className="app-drawer">
      <div className="log-list">
        {log.length === 0 ? (
          <p className="muted">No log entries yet.</p>
        ) : log.map((entry, index) => (
          <pre key={`${entry.time}-${index}`}>{entry.message}</pre>
        ))}
      </div>
    </wa-drawer>
  );
});

export default Drawer_RunLog;
