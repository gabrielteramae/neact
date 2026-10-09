import assert from "node:assert/strict";
import test from "node:test";
import { domEventName } from "./neact.js";

test("duplo clique usa o evento do DOM", () => {
    assert.equal(domEventName("onDoubleClick"), "dblclick");
    assert.equal(domEventName("onClick"), "click");
});
