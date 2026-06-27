const tabCharacter = "\t";

function selectedLineRange(value, selectionStart, selectionEnd) {
  const rangeStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const endAnchor = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
    ? selectionEnd - 1
    : selectionEnd;
  const nextLineBreak = value.indexOf("\n", endAnchor);
  const rangeEnd = nextLineBreak === -1 ? value.length : nextLineBreak;

  return { rangeStart, rangeEnd };
}

function getLineMeta(block, position) {
  const relativePosition = Math.max(0, Math.min(position, block.length));
  const beforePosition = block.slice(0, relativePosition);
  const lineIndex = beforePosition.split("\n").length - 1;
  const lineStart = beforePosition.lastIndexOf("\n") + 1;

  return {
    lineIndex,
    column: relativePosition - lineStart
  };
}

function remapIndentedPosition(block, position) {
  const { lineIndex } = getLineMeta(block, position);
  return position + lineIndex + 1;
}

function remapOutdentedPosition(block, removals, position) {
  const { lineIndex, column } = getLineMeta(block, position);
  const removedBefore = removals.slice(0, lineIndex).reduce((total, count) => total + count, 0);
  const removedOnLine = column > 0 ? removals[lineIndex] || 0 : 0;

  return position - removedBefore - removedOnLine;
}

export function applyTextareaTab(value, selectionStart, selectionEnd, outdent = false) {
  if (selectionStart === selectionEnd) {
    const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;

    if (!outdent) {
      return {
        value: `${value.slice(0, lineStart)}${tabCharacter}${value.slice(lineStart)}`,
        selectionStart: selectionStart + tabCharacter.length,
        selectionEnd: selectionStart + tabCharacter.length
      };
    }

    const removable = value[lineStart] === tabCharacter || value[lineStart] === " " ? 1 : 0;
    if (!removable) return { value, selectionStart, selectionEnd };

    const nextValue = `${value.slice(0, lineStart)}${value.slice(lineStart + removable)}`;
    const nextSelection = selectionStart > lineStart ? selectionStart - removable : selectionStart;
    return {
      value: nextValue,
      selectionStart: nextSelection,
      selectionEnd: nextSelection
    };
  }

  const { rangeStart, rangeEnd } = selectedLineRange(value, selectionStart, selectionEnd);
  const block = value.slice(rangeStart, rangeEnd);
  const relativeStart = selectionStart - rangeStart;
  const relativeEnd = selectionEnd - rangeStart;
  const lines = block.split("\n");

  if (!outdent) {
    const nextBlock = lines.map((line) => `${tabCharacter}${line}`).join("\n");
    return {
      value: `${value.slice(0, rangeStart)}${nextBlock}${value.slice(rangeEnd)}`,
      selectionStart: rangeStart + remapIndentedPosition(block, relativeStart),
      selectionEnd: rangeStart + remapIndentedPosition(block, relativeEnd)
    };
  }

  const removals = lines.map((line) => line.startsWith(tabCharacter) || line.startsWith(" ") ? 1 : 0);
  const nextBlock = lines.map((line, index) => removals[index] ? line.slice(1) : line).join("\n");

  return {
    value: `${value.slice(0, rangeStart)}${nextBlock}${value.slice(rangeEnd)}`,
    selectionStart: rangeStart + remapOutdentedPosition(block, removals, relativeStart),
    selectionEnd: rangeStart + remapOutdentedPosition(block, removals, relativeEnd)
  };
}

export function applyTextareaReturn(value, selectionStart, selectionEnd) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const line = value.slice(lineStart, selectionStart);
  const indent = line.match(/^[\t ]*/)?.[0] || "";
  const bullet = line.slice(indent.length).match(/^([-*])\s+/)?.[0] || "";
  const insertion = `\n${indent}${bullet}`;
  const nextSelection = selectionStart + insertion.length;

  return {
    value: `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`,
    selectionStart: nextSelection,
    selectionEnd: nextSelection
  };
}

function getComposedPath(event) {
  return event.nativeEvent?.composedPath?.() || event.composedPath?.() || [];
}

function getFocusedTextarea(event) {
  const path = getComposedPath(event);
  const host = path.find((element) => element?.localName === "wa-textarea");
  const textarea = path.find((element) => element?.localName === "textarea")
    || host?.shadowRoot?.querySelector("textarea");

  if (!host || !textarea) return null;
  return { host, textarea };
}

function createInputEvent() {
  try {
    return new InputEvent("input", {
      bubbles: true,
      composed: true,
      data: tabCharacter,
      inputType: "insertText"
    });
  } catch {
    return new Event("input", { bubbles: true, composed: true });
  }
}

export function handleTextareaTabKeyDown(event) {
  if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return false;

  const control = getFocusedTextarea(event);
  if (!control) return false;

  const { host, textarea } = control;
  const value = textarea.value ?? host.value ?? "";
  const selectionStart = textarea.selectionStart ?? 0;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const next = applyTextareaTab(value, selectionStart, selectionEnd, event.shiftKey);

  event.preventDefault();
  event.stopPropagation();

  textarea.value = next.value;
  host.value = next.value;
  textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
  host.setSelectionRange?.(next.selectionStart, next.selectionEnd);
  textarea.dispatchEvent(createInputEvent());

  return true;
}

export function handleTextareaReturnKeyDown(event) {
  if (
    event.key !== "Enter" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.nativeEvent?.isComposing
  ) {
    return false;
  }

  const control = getFocusedTextarea(event);
  if (!control) return false;

  const { host, textarea } = control;
  const value = textarea.value ?? host.value ?? "";
  const selectionStart = textarea.selectionStart ?? 0;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;
  const next = applyTextareaReturn(value, selectionStart, selectionEnd);

  event.preventDefault();
  event.stopPropagation();

  textarea.value = next.value;
  host.value = next.value;
  textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
  host.setSelectionRange?.(next.selectionStart, next.selectionEnd);
  textarea.dispatchEvent(createInputEvent());

  return true;
}

export function handleDrawerFormKeyDown(event, { onCancel, onSubmit }) {
  if (event.defaultPrevented) return;
  if (handleTextareaTabKeyDown(event)) return;
  if (handleTextareaReturnKeyDown(event)) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    onCancel?.();
    return;
  }

  if (
    event.key !== "Enter" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.nativeEvent?.isComposing
  ) {
    return;
  }

  const path = event.nativeEvent?.composedPath?.() || [];
  const shouldUseNativeKeyBehavior = path.some((element) => {
    const tagName = element?.localName;
    return (
      element?.isContentEditable ||
      tagName === "button" ||
      tagName === "textarea" ||
      tagName === "wa-button" ||
      tagName === "wa-dropdown" ||
      tagName === "wa-dropdown-item" ||
      tagName === "wa-textarea"
    );
  });

  if (shouldUseNativeKeyBehavior) return;

  event.preventDefault();
  event.stopPropagation();
  onSubmit?.();
}
