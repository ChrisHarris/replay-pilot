function getIndentLevel(indent) {
  return Array.from(indent).filter((char) => char === "\t" || char === " ").length;
}

export function normaliseInstructionIndent(indent) {
  return "\t".repeat(getIndentLevel(indent));
}

export function normaliseInstructionIndentation(instructions = "") {
  const lines = String(instructions).split("\n");
  const stack = [];

  return lines.map((line) => {
    if (!line.trim()) return line;

    const lineMatch = line.match(/^([\t ]*)(.*)$/);
    const content = lineMatch?.[2] || "";
    const rawLevel = normaliseInstructionIndent(lineMatch?.[1] || "").length;
    const isHeading = /^#{1,6}\s+/.test(content);
    const level = isHeading ? 0 : Math.min(rawLevel, stack.length);
    const nextLine = `${"\t".repeat(level)}${content}`;

    while (stack.length > level) stack.pop();
    stack[level] = true;
    stack.length = level + 1;

    return nextLine;
  }).join("\n");
}
