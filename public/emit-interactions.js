(() => {
  "use strict";

  if (window.__emitInteractionsBridge) return;
  window.__emitInteractionsBridge = true;

  const HOST_SOURCE = "replay-pilot-emit-interactions-host";
  const EMITTER_SOURCE = "emit-interactions";
  const VERSION = 1;
  const interactionKeys = new Set(["Enter", "Escape", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  const webAwesomeControls = new Set([
    "wa-button", "wa-checkbox", "wa-color-picker", "wa-input", "wa-number-input",
    "wa-radio", "wa-select", "wa-slider", "wa-switch", "wa-textarea"
  ]);
  const nativeControls = new Set(["button", "a", "input", "textarea", "select", "summary"]);
  const drawerFieldSelector = [
    "input:not([type=hidden])", "textarea", "select", "wa-input", "wa-number-input",
    "wa-textarea", "wa-select", "wa-checkbox", "wa-radio", "wa-switch", "wa-slider",
    "wa-color-picker"
  ].join(",");
  const pageWitnessSelector = `${drawerFieldSelector},button,a,wa-button,[role=button],[role=link]`;
  const elementIds = new WeakMap();
  const fieldInteractions = new WeakMap();
  const pendingFieldInteractions = new Map();
  const drawerObservers = new WeakMap();
  const drawerPageSignatures = new WeakMap();
  const drawerPageTimers = new WeakMap();
  const observedDrawers = new Set();
  const documentId = Math.random().toString(36).slice(2);
  let nextId = 1;
  let nextEventId = 1;
  let hostOrigin = "*";
  let sessionId = "";
  let documentPageSessionId = "";
  let emitting = false;
  let lastClick = { signature: "", time: 0 };

  function isLoopbackOrigin(origin) {
    try {
      const hostname = new URL(origin).hostname;
      return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
    } catch {
      return false;
    }
  }

  function emit(type, payload = {}) {
    window.parent.postMessage({
      source: EMITTER_SOURCE,
      version: VERSION,
      type,
      sessionId,
      ...payload
    }, hostOrigin);
  }

  function elementId(element) {
    if (!elementIds.has(element)) elementIds.set(element, `${documentId}-${nextId++}`);
    return elementIds.get(element);
  }

  function eventId(prefix) {
    return `${documentId}-${prefix}-${nextEventId++}`;
  }

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function labelledByText(element) {
    const ids = text(element.getAttribute?.("aria-labelledby")).split(" ").filter(Boolean);
    return text(ids.map((id) => document.getElementById(id)?.textContent).filter(Boolean).join(" "));
  }

  function associatedLabel(element) {
    const labels = Array.from(element.labels || []);
    if (labels.length) return text(labels.map((label) => label.textContent).join(" "));
    if (element.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return text(label.textContent);
      } catch {
        // An unusual id should not prevent the remaining fallbacks.
      }
    }
    return "";
  }

  function roleFor(element) {
    const explicitRole = text(element.getAttribute?.("role"));
    if (explicitRole) return explicitRole;

    const tag = element.localName;
    const type = text(element.type || element.getAttribute?.("type")).toLowerCase();
    if (tag === "button" || tag === "wa-button") return "button";
    if (tag === "a") return "link";
    if (tag === "input" && ["button", "submit", "reset", "image"].includes(type)) return "button";
    if (tag === "textarea" || tag === "wa-textarea") return "textbox";
    if (tag === "select" || tag === "wa-select") return "combobox";
    if (tag === "wa-checkbox" || tag === "wa-switch" || type === "checkbox") return "checkbox";
    if (tag === "wa-radio" || type === "radio") return "radio";
    if (tag === "wa-slider" || type === "range") return "slider";
    if (tag === "wa-number-input" || type === "number") return "spinbutton";
    if (tag === "input" || tag === "wa-input") return type === "search" ? "searchbox" : "textbox";
    return "";
  }

  function kindFor(role) {
    if (role === "button") return "Button";
    if (role === "link") return "Link";
    if (role === "checkbox") return "Checkbox";
    if (role === "radio") return "Radio";
    if (role === "combobox" || role === "listbox") return "Select";
    if (["textbox", "searchbox", "spinbutton", "slider"].includes(role)) return "Input";
    return "Element";
  }

  function nameFor(element, role) {
    const label = text(
      element.label ||
      element.getAttribute?.("label") ||
      element.getAttribute?.("aria-label") ||
      labelledByText(element) ||
      associatedLabel(element)
    );
    const placeholder = text(element.placeholder || element.getAttribute?.("placeholder"));
    const content = ["button", "link", "checkbox", "radio"].includes(role)
      ? text(element.innerText || element.textContent)
      : "";
    return {
      label,
      placeholder,
      name: label || content || placeholder || text(element.title || element.getAttribute?.("title"))
    };
  }

  function cssSelector(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const testId = element.getAttribute?.("data-testid");
    if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
    const name = element.getAttribute?.("name");
    if (name) return `${element.localName}[name="${CSS.escape(name)}"]`;
    return element.localName || "body";
  }

  function describe(element) {
    const role = roleFor(element);
    const names = nameFor(element, role);
    return {
      id: element.id || "",
      tag: element.localName || "",
      type: text(element.type || element.getAttribute?.("type")).toLowerCase(),
      role,
      kind: kindFor(role),
      name: names.name,
      label: names.label,
      placeholder: names.placeholder,
      testId: element.getAttribute?.("data-testid") || "",
      nameAttribute: element.getAttribute?.("name") || "",
      css: cssSelector(element)
    };
  }

  function componentFromEvent(event) {
    const origin = (event.composedPath?.() || [event.target])
      .find((item) => item instanceof Element);
    return ["wa-drawer", "wa-dialog"].includes(origin?.localName) ? origin : null;
  }

  function isVisible(element) {
    if (!(element instanceof Element) || element.closest("[hidden],[inert]")) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function drawerPageDetails(drawer) {
    const marker = Array.from(drawer.querySelectorAll("[data-emit-interactions-page]")).find(isVisible);
    const markerName = text(marker?.getAttribute("data-emit-interactions-page"));
    const hasVisibleSkeleton = Array.from(drawer.querySelectorAll("wa-skeleton")).some(isVisible);
    const heading = Array.from(drawer.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading]")).find(isVisible);
    const headingText = text(heading?.textContent);
    const fieldTargets = Array.from(drawer.querySelectorAll(drawerFieldSelector)).filter(isVisible).map(describe);
    const fields = Array.from(new Set(fieldTargets.map((target) => (
      target.label || target.name || target.placeholder || target.nameAttribute || target.id || target.tag
    )).filter(Boolean)));
    const controlName = Array.from(drawer.querySelectorAll(pageWitnessSelector))
      .filter(isVisible)
      .map(describe)
      .map((target) => target.label || target.name || target.placeholder)
      .find(Boolean);
    const fallbackText = text(drawer.textContent).slice(0, 240);
    const name = markerName
      || headingText
      || fields[0]
      || controlName
      || (drawer instanceof Document ? "Document" : describe(drawer).name)
      || "Document";
    const fieldSignature = fieldTargets.map((target) => [
      target.tag,
      target.type,
      target.id,
      target.nameAttribute,
      target.label,
      target.placeholder
    ]);

    return {
      signature: markerName
        ? JSON.stringify(["marker", markerName])
        : JSON.stringify([
          headingText,
          fieldSignature,
          fieldSignature.length ? "" : fallbackText
        ]),
      name,
      fields,
      pending: !markerName && hasVisibleSkeleton
    };
  }

  function emitComponentState(component, state, page) {
    flushPendingFields();
    const interactionId = eventId("interaction");
    emit("interaction", {
      interaction: {
        eventId: eventId(`${component.localName}-${state}`),
        interactionId,
        kind: "component-state",
        component: component.localName,
        state,
        target: describe(component),
        ...(page ? { page: { name: page.name, fields: page.fields } } : {})
      }
    });
  }

  function emitDocumentPage() {
    const page = drawerPageDetails(document);
    emit("interaction", {
      interaction: {
        eventId: eventId("document-presented"),
        interactionId: eventId("interaction"),
        kind: "page-state",
        state: "presented",
        page: { name: page.name }
      }
    });
  }

  function stopObservingDrawer(drawer) {
    const timer = drawerPageTimers.get(drawer);
    if (timer) window.clearTimeout(timer);
    drawerPageTimers.delete(drawer);
    drawerObservers.get(drawer)?.disconnect();
    drawerObservers.delete(drawer);
    drawerPageSignatures.delete(drawer);
    observedDrawers.delete(drawer);
  }

  function observeDrawerPage(drawer) {
    stopObservingDrawer(drawer);
    drawerPageSignatures.set(drawer, drawerPageDetails(drawer).signature);

    const observer = new MutationObserver(() => {
      const previousTimer = drawerPageTimers.get(drawer);
      if (previousTimer) window.clearTimeout(previousTimer);

      const timer = window.setTimeout(() => {
        drawerPageTimers.delete(drawer);
        if (!emitting || !drawer.open) return;

        const page = drawerPageDetails(drawer);
        if (page.pending) return;
        if (page.signature === drawerPageSignatures.get(drawer)) return;
        drawerPageSignatures.set(drawer, page.signature);
        emitComponentState(drawer, "page-presented", page);
      }, 50);
      drawerPageTimers.set(drawer, timer);
    });

    observer.observe(drawer, { childList: true, subtree: true });
    drawerObservers.set(drawer, observer);
    observedDrawers.add(drawer);
  }

  function onComponentLifecycle(event) {
    const component = componentFromEvent(event);
    if (!component) return;

    if (event.type === "wa-after-show") {
      if (!emitting) return;
      emitComponentState(component, "presented");
      if (component.localName === "wa-drawer") observeDrawerPage(component);
      return;
    }

    if (emitting) emitComponentState(component, "dismissed");
    if (component.localName === "wa-drawer") stopObservingDrawer(component);
  }

  function isInteractive(element) {
    if (!(element instanceof Element)) return false;
    if (webAwesomeControls.has(element.localName) || nativeControls.has(element.localName)) return true;
    return Boolean(element.getAttribute("role") || element.hasAttribute("data-testid"));
  }

  function eventElement(event) {
    const path = event.composedPath?.() || [event.target];
    const ignored = path.some((item) => item instanceof Element && item.closest?.("[data-emit-interactions-ignore]"));
    if (ignored) return null;

    const webAwesomeHost = path.find((item) => item instanceof Element && webAwesomeControls.has(item.localName));
    if (webAwesomeHost) return webAwesomeHost;

    const label = path.find((item) => item instanceof HTMLLabelElement);
    if (label?.control) return label.control;
    return path.find(isInteractive) || null;
  }

  function valueFor(element, event) {
    const path = event.composedPath?.() || [];
    const nativeField = path.find((item) => item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement || item instanceof HTMLSelectElement);
    const value = element.value ?? nativeField?.value ?? "";
    return Array.isArray(value) ? value.map(String) : String(value);
  }

  function checkedFor(element, event) {
    if (typeof element.checked === "boolean") return element.checked;
    const path = event.composedPath?.() || [];
    const nativeField = path.find((item) => item instanceof HTMLInputElement && ["checkbox", "radio"].includes(item.type));
    return Boolean(nativeField?.checked);
  }

  function isSensitive(element, event) {
    const path = event.composedPath?.() || [];
    return [element, ...path].some((item) => item instanceof Element && (
      item.getAttribute?.("type") === "password" ||
      item.getAttribute?.("autocomplete") === "current-password" ||
      item.getAttribute?.("autocomplete") === "new-password" ||
      item.hasAttribute?.("data-emit-interactions-redact")
    ));
  }

  function interactionFor(element) {
    let interactionId = fieldInteractions.get(element);
    if (!interactionId) {
      interactionId = eventId("interaction");
      fieldInteractions.set(element, interactionId);
    }
    return interactionId;
  }

  function flushPendingField(element, endInteraction = true) {
    const interaction = pendingFieldInteractions.get(element);
    if (interaction) {
      pendingFieldInteractions.delete(element);
      if (emitting) emit("interaction", { interaction });
    }
    if (endInteraction) fieldInteractions.delete(element);
  }

  function flushPendingFields() {
    Array.from(pendingFieldInteractions.keys()).forEach((element) => flushPendingField(element));
  }

  function onClick(event) {
    if (!emitting) return;
    flushPendingFields();
    const element = eventElement(event);
    if (!element) return;

    const target = describe(element);
    const signature = `${elementId(element)}:${target.role}:${target.name}`;
    const now = performance.now();
    if (signature === lastClick.signature && now - lastClick.time < 160) return;
    lastClick = { signature, time: now };

    const interactionId = eventId("interaction");
    fieldInteractions.set(element, interactionId);
    emit("interaction", {
      interaction: {
        eventId: eventId("click"),
        interactionId,
        kind: "click",
        target
      }
    });
  }

  function onInput(event) {
    if (!emitting) return;
    const element = eventElement(event);
    if (!element) return;

    const target = describe(element);
    const interactionId = interactionFor(element);
    if (target.kind === "Element") return;
    const selectLike = target.kind === "Select";
    const checkable = ["Checkbox", "Radio"].includes(target.kind);
    const redacted = isSensitive(element, event);
    const kind = checkable ? "check" : selectLike ? "select" : "fill";
    pendingFieldInteractions.set(element, {
      eventId: `${interactionId}-${kind}`,
      interactionId,
      kind,
      target,
      ...(checkable
        ? { checked: checkedFor(element, event) }
        : { value: redacted ? "" : valueFor(element, event), redacted })
    });
  }

  function onFocusOut(event) {
    if (!emitting) return;
    const element = eventElement(event);
    if (element) flushPendingField(element);
  }

  function onKeyDown(event) {
    if (!emitting || !interactionKeys.has(event.key)) return;
    const element = eventElement(event);
    if (!element) return;
    const target = describe(element);
    if (!["Input", "Select"].includes(target.kind)) return;
    const interactionId = interactionFor(element);
    flushPendingField(element, false);
    emit("interaction", {
      interaction: {
        eventId: eventId("press"),
        interactionId,
        kind: "press",
        key: event.key,
        target
      }
    });
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window.parent || message?.source !== HOST_SOURCE || message?.version !== VERSION) return;
    if (!isLoopbackOrigin(event.origin)) return;

    hostOrigin = event.origin;
    sessionId = message.sessionId || sessionId;
    if (message.type === "enable") {
      emitting = true;
      emit("ready");
      if (documentPageSessionId !== sessionId) {
        documentPageSessionId = sessionId;
        emitDocumentPage();
      }
      document.querySelectorAll("wa-drawer[open]").forEach((drawer) => {
        emitComponentState(drawer, "presented");
        observeDrawerPage(drawer);
      });
      document.querySelectorAll("wa-dialog[open]").forEach((dialog) => {
        emitComponentState(dialog, "presented");
      });
    } else if (message.type === "pause") {
      if (!emitting) return;
      flushPendingFields();
      emitting = false;
      Array.from(observedDrawers).forEach(stopObservingDrawer);
      emit("paused");
    }
  });

  document.addEventListener("click", onClick, true);
  document.addEventListener("input", onInput, true);
  document.addEventListener("change", onInput, true);
  document.addEventListener("wa-input", onInput, true);
  document.addEventListener("wa-change", onInput, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("focusout", onFocusOut, true);
  document.addEventListener("wa-after-show", onComponentLifecycle, true);
  document.addEventListener("wa-after-hide", onComponentLifecycle, true);
  window.parent.postMessage({ source: EMITTER_SOURCE, version: VERSION, type: "available", sessionId: "" }, "*");
})();
