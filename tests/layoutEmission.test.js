import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("cancels the Emit Interactions command retry after acknowledgement", async () => {
  const source = await readFile(new URL("../src/components/Layout_Main.jsx", import.meta.url), "utf8");

  assert.match(source, /event\.data\.type === "ready"[\s\S]*?clearTimeout\(retryTimer\)/);
  assert.match(source, /event\.data\.type === "paused"[\s\S]*?clearTimeout\(retryTimer\)/);
});

test("renders scenario instructions in a vertical Web Awesome scroller", async () => {
  const source = await readFile(new URL("../src/components/Layout_Main.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../public/css/styles.css", import.meta.url), "utf8");

  assert.match(source, /<wa-scroller class="scenario-description" orientation="vertical">/);
  assert.doesNotMatch(source, /<div className="scenario-description">/);
  assert.match(styles, /wa-page::part\(main-content\) \{\s*block-size: 100%;\s*max-block-size: calc\(/);
  assert.match(styles, /\.app-main \{[\s\S]*?max-block-size: calc\([\s\S]*?100dvh - var\(--banner-height/);
  assert.match(styles, /\.scenario-description \{\s*max-block-size: 100%;\s*min-block-size: 0;/);
});
