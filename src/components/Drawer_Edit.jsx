import { useEffect, useId, useRef } from "react";
import { handleDrawerFormKeyDown } from "./Utitlity_Keyboard.js";
import { normaliseInstructionIndentation } from "../lib/instructionFormatting.js";
import { instructionsToPlaywrightScript } from "../lib/instructionScript.js";

export const SCENARIO_SAVE_ICON = "down-from-dotted-line";

function getControlValue(control) {
  return control?.value || control?.shadowRoot?.querySelector("input, textarea")?.value || "";
}

export default function Drawer_Edit({ scenario, onCancel, onRemove, onSave }) {
  const formId = useId();
  const removeDialogRef = useRef(null);
  const nameRef = useRef(null);
  const instructionsRef = useRef(null);
  const scriptRef = useRef(null);

  useEffect(() => {
    if (nameRef.current) nameRef.current.value = scenario?.name || "";
    if (instructionsRef.current) instructionsRef.current.value = scenario?.instructions || "";
    if (scriptRef.current) scriptRef.current.value = scenario?.script || "";
  }, [scenario]);

  useEffect(() => {
    const instructions = instructionsRef.current;
    if (!instructions) return;

    const handleInstructionsBlur = () => regenerateScript();

    instructions.addEventListener("blur", handleInstructionsBlur);
    return () => instructions.removeEventListener("blur", handleInstructionsBlur);
  }, []);

  function regenerateScript() {
    const instructions = normaliseInstructionIndentation(
      getControlValue(instructionsRef.current)
    );
    const script = instructionsToPlaywrightScript(instructions);
    if (scriptRef.current) scriptRef.current.value = script;
    return { instructions, script };
  }

  function handleSave() {
    const generated = regenerateScript();
    onSave({
      ...scenario,
      name: getControlValue(nameRef.current).trim() || "Smoke Test",
      instructions: generated.instructions,
      script: generated.script
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
    onRemove?.(scenario);
  }

  return (
    <>
      <form id={formId} className="drawer-body scenario-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <wa-input ref={nameRef} label="Scenario name" placeholder="Smoke test"></wa-input>
        <wa-tab-group className="scenario-instructions-tabs" active="instructions">
          <wa-tab panel="instructions" active>Instructions</wa-tab>
          <wa-tab panel="script">Script</wa-tab>
          <wa-tab-panel name="instructions" active>
            <wa-textarea
              ref={instructionsRef}
              className="text-instructions"
              label="Text instructions"
              hint="Use plain english with nested bullets in a markdown format"
            ></wa-textarea>
          </wa-tab-panel>

          <wa-tab-panel name="script">
            <wa-textarea
              ref={scriptRef}
              className="playwright-script"
              label="Playwright script"
              hint="This script is generated from the Text instructions"
              disabled
            ></wa-textarea>
          </wa-tab-panel>

        </wa-tab-group>
      </form>
      <div slot="footer" className="drawer-actions" onKeyDown={handleKeyDown}>
        <wa-button size="m" variant="neutral" pill appearance="filled" onClick={onCancel}>
          <wa-icon slot="start" name="circle-xmark" variant="solid" aria-hidden="true"></wa-icon>
          Cancel
        </wa-button>
        {scenario?.id ? (
          <wa-button size="m" variant="danger" pill appearance="filled" type="button" onClick={handleRemoveRequest}>
            <wa-icon slot="start" name="trash" variant="solid" aria-hidden="true"></wa-icon>
            Remove
          </wa-button>
        ) : null}
        <wa-button size="m" variant="neutral" pill appearance="accent" type="submit" form={formId}>
          <wa-icon slot="start" name={SCENARIO_SAVE_ICON} variant="solid" aria-hidden="true"></wa-icon>
          Save
        </wa-button>
      </div>
      {scenario?.id ? (
        <wa-dialog ref={removeDialogRef} label="Are you sure?" with-footer>
          <p>This will remove {scenario.name} from the project and archive its markdown.</p>
          <wa-button slot="footer" variant="neutral" appearance="filled" data-dialog="close">
            Cancel
          </wa-button>
          <wa-button slot="footer" variant="danger" appearance="filled" onClick={handleRemoveConfirm}>
            <wa-icon slot="start" name="trash" variant="solid" aria-hidden="true"></wa-icon>
            Remove
          </wa-button>
        </wa-dialog>
      ) : null}
    </>
  );
}
