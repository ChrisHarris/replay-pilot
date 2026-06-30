import { normaliseInstructionIndent } from "./instructionFormatting.js";

const instructionIconByCommand = {
  "Open URL": "globe",
  "Page Open": "file",
  "Tap Textbox": "input-pipe",
  "Tap Checkbox": "square-check",
  "Tap Button": "rectangle",
  "Drawer Open": "window-maximize",
  "Dialog Open": "object-subtract",
  "Run complete": "stop"
};

function instructionCommand(text = "") {
  const separator = String(text).indexOf(":");
  return String(text).slice(0, separator < 0 ? undefined : separator).trim();
}

export function getInstructionPresentation(text = "", depth = 0) {
  const command = instructionCommand(text);
  const quietPercentage = Math.min(Math.max(Math.trunc(Number(depth) || 0), 0) * 20, 80);

  return {
    color: `color-mix(in oklab, var(--wa-color-text-normal) ${100 - quietPercentage}%, var(--wa-color-text-quiet) ${quietPercentage}%)`,
    icon: instructionIconByCommand[command] || "",
    rotate: command === "Dialog Open" ? 90 : undefined
  };
}

function normaliseInstructionText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function readInstructionLine(line, hasHeadingContext) {
  const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
  if (heading) {
    return {
      isHeading: true,
      level: 0,
      text: heading[1]
    };
  }

  const bullet = line.match(/^([\t ]*)[-*]\s+(.+)$/);
  if (bullet) {
    return {
      isHeading: false,
      level: normaliseInstructionIndent(bullet[1]).length + (hasHeadingContext ? 1 : 0),
      text: bullet[2]
    };
  }

  const textLine = line.match(/^([\t ]*)(.+)$/);
  return {
    isHeading: false,
    level: normaliseInstructionIndent(textLine?.[1] || "").length + (hasHeadingContext ? 1 : 0),
    text: textLine?.[2] || line
  };
}

export function parseInstructionTree(instructions = "") {
  const roots = [];
  const stack = [];
  let hasHeadingContext = false;
  let stepIndex = 0;

  for (const line of String(instructions).split("\n")) {
    if (!line.trim()) continue;

    const parsedLine = readInstructionLine(line, hasHeadingContext);
    const level = parsedLine.level;
    if (parsedLine.isHeading) hasHeadingContext = true;

    const node = {
      text: normaliseInstructionText(parsedLine.text),
      stepIndex,
      children: []
    };
    if (!node.text) continue;
    stepIndex += 1;

    while (stack.length > level) stack.pop();

    const parent = stack[level - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);

    stack[level] = node;
    stack.length = level + 1;
  }

  return roots;
}

function informationalNode(text) {
  return {
    text,
    stepIndex: null,
    informational: true,
    children: []
  };
}

function runCompleteNode() {
  return {
    text: "Run complete",
    stepIndex: null,
    informational: true,
    children: [informationalNode("Recording: Stop")]
  };
}

function buttonAction(nextNode, parentNode, parentNextNode) {
  const nextCommand = instructionCommand(nextNode?.text);
  const parentCommand = instructionCommand(parentNode?.text);
  const parentNextCommand = instructionCommand(parentNextNode?.text);

  if (nextCommand === "Drawer Open") return "Action: Open Drawer";
  if (nextCommand === "Dialog Open") return "Action: Open Dialog";
  if (nextCommand === "Page Open") return "Action: Open Page";
  if (nextCommand === "Drawer Closed") return "Action: Close Drawer";
  if (parentCommand === "Dialog Open") return "Action: Close Dialog";
  if (parentCommand === "Drawer Open" && parentNextCommand === "Drawer Closed") {
    return "Action: Close Drawer";
  }

  return "Action: Activate Button";
}

function leafInformation(command) {
  return {
    "Open URL": "Wait For: Network idle",
    "Page Open": "Wait For: Page load",
    "Tap Textbox": "Action: Focus Textbox",
    "Tap Checkbox": "Action: Toggle Checkbox",
    "Drawer Open": "Wait For: Drawer open",
    "Dialog Open": "Wait For: Dialog open"
  }[command] || "";
}

function addDisplayInformation(nodes, context = {}) {
  return nodes.map((node, index) => {
    const nextNode = nodes[index + 1];
    const children = addDisplayInformation(node.children, {
      parentNode: node,
      parentNextNode: nextNode
    });

    if (children.length > 0) return { ...node, children };

    const command = instructionCommand(node.text);
    if (command === "Tap Button") {
      return {
        ...node,
        children: [informationalNode(buttonAction(nextNode, context.parentNode, context.parentNextNode))]
      };
    }
    const information = leafInformation(command);
    if (information) return { ...node, children: [informationalNode(information)] };

    return { ...node, children };
  });
}

/** Builds a presentation-only tree. Informational children never enter the executable instruction parser. */
export function getInstructionDisplayTree(instructions = "") {
  return [...addDisplayInformation(parseInstructionTree(instructions)), runCompleteNode()];
}
