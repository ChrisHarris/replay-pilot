import { useEffect, useRef } from "react";

export default function Drawer_Shell({ open, label, children, onClose }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    const drawerIsShowing = () => drawer.hasAttribute("open") || drawer.shadowRoot?.querySelector("dialog")?.open;
    let cancelled = false;
    let afterShow;
    let openTimer;
    let safariTimer;

    if (open) {
      openTimer = window.setTimeout(async () => {
        await customElements.whenDefined("wa-drawer");
        await drawer.updateComplete;
        if (cancelled || drawerIsShowing()) return;

        afterShow = () => window.clearTimeout(safariTimer);
        drawer.addEventListener("wa-after-show", afterShow, { once: true });

        safariTimer = window.setTimeout(() => {
          drawer.removeEventListener("wa-after-show", afterShow);
          const dialog = drawer.shadowRoot?.querySelector("dialog");
          if (dialog?.classList.contains("show")) {
            dialog.dispatchEvent(new AnimationEvent("animationend", { bubbles: false }));
          }
        }, 300);

        drawer.setAttribute("open", "");
      }, 0);
    } else if (drawerIsShowing()) {
      const dialog = drawer.shadowRoot?.querySelector("dialog");
      if (dialog?.open && typeof drawer.requestClose === "function") drawer.requestClose(dialog);
      else drawer.removeAttribute("open");
    }

    return () => {
      cancelled = true;
      window.clearTimeout(openTimer);
      window.clearTimeout(safariTimer);
      if (afterShow) drawer.removeEventListener("wa-after-show", afterShow);
    };
  }, [open]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleAfterHide = (event) => {
      if (event.target === drawer) onClose?.();
    };

    drawer.addEventListener("wa-after-hide", handleAfterHide);
    return () => drawer.removeEventListener("wa-after-hide", handleAfterHide);
  }, [onClose]);

  return (
    <wa-drawer
      ref={drawerRef}
      label={label}
      placement="bottom"
      className="action-drawer"
      light-dismiss
      with-footer
    >
      {open ? children : null}
    </wa-drawer>
  );
}
