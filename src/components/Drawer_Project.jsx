import { useEffect, useId, useRef, useState } from "react";
import { handleDrawerFormKeyDown } from "./Utitlity_Keyboard.js";
import { defaultCapture, getOutputQuality, outputQualityOptions } from "../lib/projectDefaults.js";

const defaultProject = {
  name: "",
  icon: "mobile-alt",
  url: "http://localhost:5173",
  capture: defaultCapture
};

function getControlValue(control) {
  return control?.value || control?.shadowRoot?.querySelector("input, textarea")?.value || "";
}

function ResolutionDropdown({ value, onChange }) {
  const dropdownRef = useRef(null);
  const label = `@${value}x`;

  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (!dropdown) return;

    const handleSelect = (event) => {
      const nextValue = Number(event.detail.item.value);
      if (nextValue) onChange(nextValue);
    };

    dropdown.addEventListener("wa-select", handleSelect);
    return () => dropdown.removeEventListener("wa-select", handleSelect);
  }, [onChange]);

  return (
    <div className="field-stack">
      <span className="field-label">Capture Resolution</span>
      <wa-dropdown ref={dropdownRef}>
        <wa-button slot="trigger" appearance="outlined" size="m" with-caret>{label}</wa-button>
        <wa-dropdown-item value="1">@1x</wa-dropdown-item>
        <wa-dropdown-item value="2">@2x</wa-dropdown-item>
        <wa-dropdown-item value="3">@3x</wa-dropdown-item>
      </wa-dropdown>
    </div>
  );
}

function OutputQualityDropdown({ value, onChange }) {
  const dropdownRef = useRef(null);
  const selectedOption = getOutputQuality(value);

  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (!dropdown) return;

    const handleSelect = (event) => {
      const nextValue = event.detail.item.value;
      if (nextValue) onChange(nextValue);
    };

    dropdown.addEventListener("wa-select", handleSelect);
    return () => dropdown.removeEventListener("wa-select", handleSelect);
  }, [onChange]);

  return (
    <div className="field-stack">
      <span className="field-label">Output quality</span>
      <wa-dropdown ref={dropdownRef}>
        <wa-button slot="trigger" appearance="outlined" size="m" with-caret>{selectedOption.label}</wa-button>
        {outputQualityOptions.map((option) => (
          <wa-dropdown-item key={option.value} value={option.value}>{option.label}</wa-dropdown-item>
        ))}
      </wa-dropdown>
    </div>
  );
}

export default function Drawer_Project({ project, onCancel, onRemove, onSave }) {
  const formId = useId();
  const removeDialogRef = useRef(null);
  const nameRef = useRef(null);
  const iconRef = useRef(null);
  const urlRef = useRef(null);
  const widthRef = useRef(null);
  const heightRef = useRef(null);
  const [iconPreview, setIconPreview] = useState(project?.icon || defaultProject.icon);
  const [resolution, setResolution] = useState(project?.capture?.resolution || defaultProject.capture.resolution);
  const [outputQuality, setOutputQuality] = useState(getOutputQuality(project?.capture?.outputQuality).value);

  useEffect(() => {
    const next = project || defaultProject;
    if (nameRef.current) nameRef.current.value = next.name || "";
    if (iconRef.current) iconRef.current.value = next.icon || defaultProject.icon;
    if (urlRef.current) urlRef.current.value = next.url || defaultProject.url;
    if (widthRef.current) widthRef.current.value = next.capture?.width || defaultProject.capture.width;
    if (heightRef.current) heightRef.current.value = next.capture?.height || defaultProject.capture.height;
    setIconPreview(next.icon || defaultProject.icon);
    setResolution(next.capture?.resolution || defaultProject.capture.resolution);
    setOutputQuality(getOutputQuality(next.capture?.outputQuality).value);
  }, [project]);

  useEffect(() => {
    const input = iconRef.current;
    if (!input) return;
    const targets = [];
    let disposed = false;

    const handleIconDefocus = () => {
      setIconPreview(getControlValue(input).trim() || defaultProject.icon);
    };

    const addTarget = (target) => {
      if (disposed || !target || targets.includes(target)) return;
      targets.push(target);
      target.addEventListener("blur", handleIconDefocus);
      target.addEventListener("change", handleIconDefocus);
      target.addEventListener("focusout", handleIconDefocus);
    };

    const attachListeners = () => {
      addTarget(input);
      addTarget(input.input || input.shadowRoot?.querySelector("input"));
    };

    const handlePotentialDefocus = (event) => {
      if (event.composedPath?.().includes(input)) return;
      requestAnimationFrame(handleIconDefocus);
    };

    const handleTabAway = (event) => {
      if (event.key === "Tab") requestAnimationFrame(handleIconDefocus);
    };

    attachListeners();
    const frame = requestAnimationFrame(attachListeners);
    input.updateComplete?.then(attachListeners);
    document.addEventListener("pointerdown", handlePotentialDefocus, true);
    input.addEventListener("keydown", handleTabAway);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePotentialDefocus, true);
      input.removeEventListener("keydown", handleTabAway);
      targets.forEach((target) => {
        target.removeEventListener("blur", handleIconDefocus);
        target.removeEventListener("change", handleIconDefocus);
        target.removeEventListener("focusout", handleIconDefocus);
      });
    };
  }, []);

  function handleSave() {
    onSave({
      ...project,
      name: getControlValue(nameRef.current).trim() || defaultProject.name,
      icon: getControlValue(iconRef.current).trim() || defaultProject.icon,
      url: getControlValue(urlRef.current).trim() || defaultProject.url,
      capture: {
        width: Number(getControlValue(widthRef.current) || defaultProject.capture.width),
        height: Number(getControlValue(heightRef.current) || defaultProject.capture.height),
        resolution,
        outputQuality
      }
    });
  }

  function handleSubmit(event) {
    event?.preventDefault();
    handleSave();
  }

  function handleKeyDown(event) {
    handleDrawerFormKeyDown(event, { onCancel, onSubmit: handleSave });
  }

  async function handleRemoveRequest() {
    await customElements.whenDefined("wa-dialog");
    if (removeDialogRef.current) removeDialogRef.current.open = true;
  }

  function handleRemoveConfirm() {
    if (removeDialogRef.current) removeDialogRef.current.open = false;
    onRemove(project);
  }

  return (
    <>
      <form id={formId} className="drawer-body form-stack" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <wa-input ref={nameRef} label="Project name"></wa-input>
        <div className="wa-flank project-icon-field wa-align-items-end">
          <wa-avatar shape="rounded" className="project-icon-avatar" label={`Project icon preview: ${iconPreview}`}>
            <wa-icon slot="icon" name={iconPreview} variant="solid" aria-hidden="true"></wa-icon>
          </wa-avatar>
          <wa-input ref={iconRef} label="Project icon"></wa-input>
        </div>
        <wa-input ref={urlRef} label="Project URL" type="url"></wa-input>
        <div className="wa-cluster capture-size-fields">
          <wa-input ref={widthRef} label="Capture width" type="number" inputmode="numeric" placeholder="px"></wa-input>
          <wa-input ref={heightRef} label="Capture height" type="number" inputmode="numeric" placeholder="px"></wa-input>
          <ResolutionDropdown value={resolution} onChange={setResolution} />
        </div>
        <OutputQualityDropdown value={outputQuality} onChange={setOutputQuality} />
      </form>
      <div slot="footer" className="drawer-actions" onKeyDown={handleKeyDown}>
        <wa-button size="m" variant="neutral" pill appearance="filled" type="button" onClick={onCancel}>
          <wa-icon slot="start" name="circle-xmark" variant="solid" aria-hidden="true"></wa-icon>
          Cancel
        </wa-button>
        {project?.id ? (
          <wa-button size="m" variant="neutral" pill appearance="filled" type="button" onClick={handleRemoveRequest}>
            <wa-icon slot="start" name="trash" variant="solid" aria-hidden="true"></wa-icon>
            Remove
          </wa-button>
        ) : null}
        <wa-button size="m" variant="neutral" pill appearance="accent" type="submit" form={formId}>
          <wa-icon slot="start" name="down-from-dotted-line" variant="solid" aria-hidden="true"></wa-icon>
          Save
        </wa-button>
      </div>
      {project?.id ? (
        <wa-dialog ref={removeDialogRef} label="Are you sure?" with-footer>
          <p>This will remove {project.name} from the navigation.</p>
          <wa-button slot="footer" variant="neutral" appearance="filled" data-dialog="close">
            Cancel
          </wa-button>
          <wa-button slot="footer" variant="neutral" appearance="filled" onClick={handleRemoveConfirm}>
            <wa-icon slot="start" name="trash" variant="solid" aria-hidden="true"></wa-icon>
            Remove
          </wa-button>
        </wa-dialog>
      ) : null}
    </>
  );
}
