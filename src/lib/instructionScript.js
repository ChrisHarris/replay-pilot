import { parseInstructionTree } from "./instructionTree.js";

function quoted(value) {
  return JSON.stringify(String(value ?? ""));
}

function cssAttributeValue(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\n\r\f]/g, "\\a ");
}

function instructionParts(text) {
  const separator = text.indexOf(":");
  if (separator < 0) return { command: text.trim(), value: "" };
  return {
    command: text.slice(0, separator).trim(),
    value: text.slice(separator + 1).trim()
  };
}

function roleForKind(kind) {
  return {
    Button: "button",
    Link: "link",
    Textbox: "textbox",
    Input: "textbox",
    "Number Input": "spinbutton",
    Checkbox: "checkbox",
    Radio: "radio",
    Select: "combobox"
  }[kind] || "";
}

function webAwesomeFieldTags(kind) {
  return {
    Textbox: ["wa-input", "wa-textarea"],
    Input: ["wa-input", "wa-textarea"],
    "Number Input": ["wa-number-input"],
    Select: ["wa-select"]
  }[kind] || [];
}

function actionParts(command) {
  const match = command.match(/^Tap\s+(.+)$/);
  return match ? { kind: match[1], role: roleForKind(match[1]) } : null;
}

function unescapeMarkdownValue(value) {
  return String(value).replace(/\\n/g, "\n");
}

export function instructionsToPlaywrightScript(instructions = "") {
  const roots = parseInstructionTree(instructions);
  const lines = [
    "const defaultStepWaitMs = 750;",
    "const transitionWaitMs = 2000;"
  ];
  const openComponents = [];
  let componentCount = 0;

  function currentScope() {
    return openComponents.at(-1)?.variable || "page";
  }

  function addDefaultStepWait() {
    lines.push("await page.waitForTimeout(defaultStepWaitMs);");
  }

  function locatorFor(kind, role, name) {
    const scope = currentScope();
    if (role) {
      const fieldTags = webAwesomeFieldTags(kind);
      const exactRoleName = fieldTags.length === 0 && !["Checkbox", "Radio"].includes(kind);
      const roleLocator = `${scope}.getByRole(${quoted(role)}, { name: ${quoted(name)}, exact: ${exactRoleName} })`;
      const fieldSelector = fieldTags
        .map((tag) => `${tag}[label="${cssAttributeValue(name)}"]`)
        .join(", ");
      if (fieldSelector) {
        return `${scope}.locator(${quoted(fieldSelector)}).getByRole(${quoted(role)}).or(${roleLocator})`;
      }
      return roleLocator;
    }
    return `${scope}.getByText(${quoted(name)}, { exact: true })`;
  }

  function compileNodes(nodes, activeLocator = "", activeControl = null) {
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      const { command, value } = instructionParts(node.text);
      lines.push(`await helpers.step(${node.stepIndex}, ${quoted(node.text)});`);

      if (["Open App", "Open URL"].includes(command)) {
        const url = command === "Open URL" && value ? quoted(value) : "project.url";
        lines.push(`await page.goto(${url}, { waitUntil: "networkidle" });`);
        addDefaultStepWait();
        compileNodes(node.children);
        continue;
      }

      const waitMatch = command.match(/^Wait\s+([\d.]+)\s*(seconds?|s|milliseconds?|ms)$/i);
      if (waitMatch) {
        const amount = Number(waitMatch[1]);
        const unit = waitMatch[2].toLowerCase();
        const milliseconds = unit.startsWith("ms") || unit.startsWith("millisecond")
          ? amount
          : amount * 1000;
        lines.push(`await page.waitForTimeout(${Math.round(milliseconds)});`);
        compileNodes(node.children, activeLocator, activeControl);
        continue;
      }

      if (/^Wait for .+ (Popup|Drawer|Dialog)$/i.test(command)) {
        lines.push(`// ${command}`);
        lines.push("await page.waitForTimeout(transitionWaitMs);");
        compileNodes(node.children, activeLocator, activeControl);
        continue;
      }

      if (["Drawer Open", "Dialog Open"].includes(command)) {
        componentCount += 1;
        const componentType = command === "Dialog Open" ? "dialog" : "drawer";
        const variable = `${componentType}${componentCount}`;
        const selector = `wa-${componentType}[label="${cssAttributeValue(value)}"][open]`;
        lines.push(`const ${variable} = page.locator(${quoted(selector)});`);
        lines.push(`await ${variable}.waitFor({ state: "attached" });`);
        lines.push("await page.waitForTimeout(transitionWaitMs);");
        openComponents.push({ name: value, type: componentType, variable });
        compileNodes(node.children);
        const nextInstruction = instructionParts(nodes[nodeIndex + 1]?.text || "");
        const hasExplicitDrawerClose = componentType === "drawer"
          && nextInstruction.command === "Drawer Closed"
          && nextInstruction.value === value;
        const nestingInfersDrawerClose = componentType === "drawer"
          && Boolean(nodes[nodeIndex + 1])
          && !hasExplicitDrawerClose;
        if (componentType === "dialog" || nestingInfersDrawerClose) {
          lines.push(`await ${variable}.waitFor({ state: "hidden" });`);
          lines.push("await page.waitForTimeout(transitionWaitMs);");
          openComponents.pop();
        }
        continue;
      }

      if (command === "Drawer Closed") {
        const componentType = "drawer";
        const componentIndex = openComponents
          .map((component) => component.type === componentType && component.name === value)
          .lastIndexOf(true);
        const index = componentIndex >= 0 ? componentIndex : openComponents.length - 1;
        const component = openComponents[index];
        if (component) {
          lines.push(`await ${component.variable}.waitFor({ state: "hidden" });`);
          lines.push("await page.waitForTimeout(transitionWaitMs);");
          openComponents.splice(index);
        } else {
          lines.push(`// ${componentType === "dialog" ? "Dialog" : "Drawer"} closed: ${value}`);
          lines.push("await page.waitForTimeout(transitionWaitMs);");
        }
        continue;
      }

      if (command === "Page Open") {
        const scope = currentScope();
        if (value === "Document") {
          lines.push(`await ${scope}.locator("body").waitFor({ state: "visible" });`);
        } else {
          const markerSelector = `[data-emit-interactions-page="${cssAttributeValue(value)}"]`;
          lines.push(`await ${scope}.locator(${quoted(markerSelector)}).or(${scope}.getByText(${quoted(value)}, { exact: true })).or(${scope}.getByLabel(${quoted(value)}, { exact: false })).first().waitFor({ state: "visible" });`);
        }
        lines.push("await page.waitForTimeout(transitionWaitMs);");
        compileNodes(node.children, activeLocator, activeControl);
        continue;
      }

      const action = actionParts(command);
      if (action) {
        const locator = locatorFor(action.kind, action.role, value);
        const hasCheckedChild = node.children.some((child) => instructionParts(child.text).command === "Checked");
        if (!hasCheckedChild) lines.push(`await ${locator}.click();`);
        addDefaultStepWait();
        compileNodes(node.children, locator, {
          kind: action.kind,
          hostLocator: action.kind === "Checkbox"
            ? `${currentScope()}.locator("wa-checkbox").filter({ hasText: ${quoted(value)} })`
            : ""
        });
        continue;
      }

      if (command === "Enter" && activeLocator) {
        if (value === "[redacted]") lines.push(`// Enter a sensitive value into ${activeLocator}.`);
        else lines.push(`await ${activeLocator}.fill(${quoted(unescapeMarkdownValue(value))});`);
        addDefaultStepWait();
      } else if (command === "Select" && activeLocator) {
        lines.push(`await ${activeLocator}.selectOption(${quoted(unescapeMarkdownValue(value))});`);
        addDefaultStepWait();
      } else if (command === "Checked" && activeLocator) {
        const checked = value !== "false";
        if (activeControl?.kind === "Checkbox" && activeControl.hostLocator) {
          lines.push(`if ((await ${activeLocator}.isChecked()) !== ${checked}) {`);
          lines.push(`  const webAwesomeCheckbox = ${activeControl.hostLocator};`);
          lines.push("  if (await webAwesomeCheckbox.count()) await webAwesomeCheckbox.evaluate((checkbox) => checkbox.click());");
          lines.push(`  else await ${activeLocator}.${checked ? "check" : "uncheck"}();`);
          lines.push("}");
        } else {
          lines.push(`await ${activeLocator}.${checked ? "check" : "uncheck"}();`);
        }
        addDefaultStepWait();
      } else if (command === "Press" && activeLocator) {
        lines.push(`await ${activeLocator}.press(${quoted(value)});`);
        addDefaultStepWait();
      } else {
        lines.push(`// ${node.text}`);
        addDefaultStepWait();
        compileNodes(node.children, activeLocator, activeControl);
      }
    }
  }

  compileNodes(roots);
  return lines.join("\n");
}
