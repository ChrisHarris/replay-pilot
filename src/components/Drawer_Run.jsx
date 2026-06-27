export default function Drawer_Run({ onCancel }) {
  return (
    <>
      <div className="drawer-body"></div>
      <div slot="footer" className="drawer-actions">
        <wa-button size="m" variant="neutral" pill appearance="filled" onClick={onCancel}>
          <wa-icon slot="start" name="circle-xmark" variant="solid" aria-hidden="true"></wa-icon>
          Cancel
        </wa-button>
      </div>
    </>
  );
}
