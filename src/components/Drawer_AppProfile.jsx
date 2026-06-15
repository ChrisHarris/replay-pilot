import { forwardRef, useEffect, useRef } from "react";

const Drawer_AppProfile = forwardRef(function Drawer_AppProfile({ profile, scenarioPacks, onSave }, ref) {
  const nameRef = useRef(null);
  const urlRef = useRef(null);
  const scenarioRef = useRef(null);
  const widthRef = useRef(null);
  const heightRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    if (nameRef.current) nameRef.current.value = profile.name;
    if (urlRef.current) urlRef.current.value = profile.targetUrl;
    if (scenarioRef.current) scenarioRef.current.value = profile.scenarioPack;
    if (widthRef.current) widthRef.current.value = profile.viewportWidth;
    if (heightRef.current) heightRef.current.value = profile.viewportHeight;
  }, [profile]);

  function handleSave() {
    onSave({
      ...profile,
      name: nameRef.current?.value || profile.name,
      targetUrl: urlRef.current?.value || profile.targetUrl,
      scenarioPack: scenarioRef.current?.value || profile.scenarioPack,
      viewportWidth: Number(widthRef.current?.value || profile.viewportWidth),
      viewportHeight: Number(heightRef.current?.value || profile.viewportHeight)
    });
  }

  return (
    <wa-drawer ref={ref} label="Edit app profile" placement="end" className="app-drawer">
      <div className="form-stack drawer-body">
        <wa-input ref={nameRef} label="Profile name"></wa-input>
        <wa-input ref={urlRef} label="Target URL"></wa-input>
        <wa-select ref={scenarioRef} label="Default scenario pack">
          {scenarioPacks.map((pack) => (
            <wa-option key={pack.id} value={pack.id}>{pack.name}</wa-option>
          ))}
        </wa-select>
        <div className="field-pair">
          <wa-number-input ref={widthRef} label="Width"></wa-number-input>
          <wa-number-input ref={heightRef} label="Height"></wa-number-input>
        </div>
      </div>
      <div slot="footer" className="drawer-actions">
        <wa-button appearance="outlined" onClick={() => { ref.current.open = false; }}>Cancel</wa-button>
        <wa-button variant="brand" onClick={handleSave}>Save profile</wa-button>
      </div>
    </wa-drawer>
  );
});

export default Drawer_AppProfile;
