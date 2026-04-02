import test from "node:test";
import assert from "node:assert/strict";

import { parseCliArgs, renderMessageContent } from "../src/cli.js";

test("parseCliArgs joins prompt arguments", () => {
  const result = parseCliArgs(["node", "src/index.ts", "hello", "agent"]);

  assert.equal(result.help, false);
  assert.equal(result.prompt, "hello agent");
});

test("parseCliArgs detects help flag", () => {
  const result = parseCliArgs(["node", "src/index.ts", "--help"]);

  assert.equal(result.help, true);
  assert.equal(result.prompt, undefined);
});

test("renderMessageContent handles text blocks", () => {
  const result = renderMessageContent([
    { type: "text", text: "第一行" },
    { type: "text", text: "第二行" },
  ]);

  assert.equal(result, "第一行\n第二行");
});
