import assert from "node:assert/strict";
import test from "node:test";

import { scriptSafeJson } from "./html-script-json.mjs";

test("scriptSafeJson blocks HTML script termination while preserving the JSON value", () => {
  const hostile = {
    label: "</script><script>alert('graph')</script>",
    html: "A&B > C",
    separators: "line\u2028paragraph\u2029end",
  };
  const serialized = scriptSafeJson(hostile);

  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.includes(">"), false);
  assert.equal(serialized.includes("&"), false);
  assert.equal(serialized.includes("\u2028"), false);
  assert.equal(serialized.includes("\u2029"), false);
  assert.deepEqual(JSON.parse(serialized), hostile);
});

test("scriptSafeJson rejects values JSON cannot represent at the top level", () => {
  assert.throws(() => scriptSafeJson(undefined), TypeError);
});
