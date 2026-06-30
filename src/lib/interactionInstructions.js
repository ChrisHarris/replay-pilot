function targetName(target = {}) {
  return target.name
    || target.label
    || target.placeholder
    || target.testId
    || target.id
    || target.tag
    || "Unlabelled element";
}

function targetKind(target = {}) {
  if (["textbox", "searchbox"].includes(target.role)) return "Textbox";
  if (target.role === "spinbutton") return "Number Input";
  if (target.role === "button") return "Button";
  if (target.role === "link") return "Link";
  if (target.role === "checkbox") return "Checkbox";
  if (target.role === "radio") return "Radio";
  if (["combobox", "listbox"].includes(target.role)) return "Select";
  return target.kind || "Element";
}

function markdownValue(value) {
  if (Array.isArray(value)) return value.map(markdownValue).join(", ");
  return String(value ?? "").replace(/\r?\n/g, "\\n");
}

function instructionLine(depth, text) {
  return `${"\t".repeat(Math.max(0, depth))}- ${text}`;
}

export function updateCapturedInteractions(interactions, interaction) {
  if (!interaction?.eventId || !interaction?.kind) return interactions;
  const existingIndex = interactions.findIndex((item) => item.eventId === interaction.eventId);
  if (existingIndex < 0) return [...interactions, interaction];

  const next = [...interactions];
  next[existingIndex] = interaction;
  return next;
}

export function interactionsToInstructions(interactions = [], projectUrl = "") {
  const lines = [instructionLine(0, `Open URL: ${projectUrl || "about:blank"}`)];
  const interactionDepths = new Map();
  let depth = 0;

  function addTap(interaction) {
    const tapDepth = depth;
    lines.push(instructionLine(tapDepth, `Tap ${targetKind(interaction.target)}: ${targetName(interaction.target)}`));
    interactionDepths.set(interaction.interactionId || interaction.eventId, tapDepth);
    return tapDepth;
  }

  function parentDepth(interaction) {
    const id = interaction.interactionId || interaction.eventId;
    return interactionDepths.has(id) ? interactionDepths.get(id) : addTap(interaction);
  }

  for (const interaction of interactions) {
    if (interaction.kind === "page-state" && interaction.state === "presented") {
      lines.push(instructionLine(depth, `Page Open: ${interaction.page?.name || "Document"}`));
      continue;
    }

    if (interaction.kind === "component-state" && ["wa-drawer", "wa-dialog"].includes(interaction.component)) {
      const componentName = interaction.component === "wa-dialog" ? "Dialog" : "Drawer";
      if (interaction.state === "presented") {
        lines.push(instructionLine(depth, `${componentName} Open: ${targetName(interaction.target)}`));
        depth += 1;
      } else if (interaction.state === "dismissed") {
        depth = Math.max(0, depth - 1);
        if (interaction.component === "wa-drawer") {
          lines.push(instructionLine(depth, `Drawer Closed: ${targetName(interaction.target)}`));
        }
      } else if (interaction.component === "wa-drawer" && interaction.state === "page-presented") {
        const pageName = interaction.page?.name || targetName(interaction.target);
        lines.push(instructionLine(depth, `Page Open: ${pageName}`));
      }
      continue;
    }

    if (interaction.kind === "click") {
      addTap(interaction);
      continue;
    }

    const childDepth = parentDepth(interaction) + 1;
    if (interaction.kind === "fill") {
      lines.push(instructionLine(childDepth, `Enter: ${interaction.redacted ? "[redacted]" : markdownValue(interaction.value)}`));
    } else if (interaction.kind === "select") {
      lines.push(instructionLine(childDepth, `Select: ${markdownValue(interaction.value)}`));
    } else if (interaction.kind === "check") {
      lines.push(instructionLine(childDepth, `Checked: ${Boolean(interaction.checked)}`));
    } else if (interaction.kind === "press") {
      lines.push(instructionLine(childDepth, `Press: ${interaction.key}`));
    }
  }

  return lines.join("\n");
}
