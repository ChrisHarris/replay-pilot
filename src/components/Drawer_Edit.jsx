import { useEffect, useId, useRef } from "react";
import { handleDrawerFormKeyDown } from "./Utitlity_Keyboard.js";
import { normaliseInstructionIndentation } from "../lib/instructionFormatting.js";

export const defaultScenarioInstructions = `# Open App
- Open App:
\t- Append to url: /?qr=demo-ticket#demo
\t- Wait 2 seconds
\t
# Example Instructions (All text below is ignored)
- Open App
\t- Append to url: /?qr=demo-ticket#demo
\t- Tap Sign Up button
- Sign Up Form
\t- Tap 'Your name' field
\t\t- Enter 'Janet Denbeigh'
\t- Tap 'Your UK Mobile number'
\t\t- Enter 'abc'
\t- Tap 'Your UK Mobile number' Clear button
\t\t- Enter '01234 56789'
\t\t- Unfocus field
\t- Tap Continue button`;

function getControlValue(control) {
  return control?.value || control?.shadowRoot?.querySelector("input, textarea")?.value || "";
}

export default function Drawer_Edit({ scenario, onCancel, onSave }) {
  const formId = useId();
  const nameRef = useRef(null);
  const instructionsRef = useRef(null);
  const scriptRef = useRef(null);

  useEffect(() => {
    if (nameRef.current) nameRef.current.value = scenario?.name || "";
    if (instructionsRef.current) instructionsRef.current.value = scenario?.instructions || defaultScenarioInstructions;
    if (scriptRef.current) scriptRef.current.value = scenario?.script || "";
  }, [scenario]);

  function handleSave() {
    onSave({
      ...scenario,
      name: getControlValue(nameRef.current).trim() || "Smoke Test",
      instructions: normaliseInstructionIndentation(getControlValue(instructionsRef.current) || defaultScenarioInstructions),
      script: getControlValue(scriptRef.current)
    });
  }

  function handleSubmit(event) {
    event?.preventDefault();
    handleSave();
  }

  function handleKeyDown(event) {
    handleDrawerFormKeyDown(event, { onCancel, onSubmit: handleSave });
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
            ></wa-textarea>
          </wa-tab-panel>

        </wa-tab-group>
      </form>
      <div slot="footer" className="drawer-actions" onKeyDown={handleKeyDown}>
        <wa-button size="m" variant="neutral" pill appearance="filled" onClick={onCancel}>
          <wa-icon slot="start" name="circle-xmark" variant="solid" aria-hidden="true"></wa-icon>
          Cancel
        </wa-button>
        <wa-button size="m" variant="neutral" pill appearance="accent" type="submit" form={formId}>
          <wa-icon slot="start" name="down-from-dotted-line" variant="solid" aria-hidden="true"></wa-icon>
          Save
        </wa-button>
      </div>
    </>
  );
}
