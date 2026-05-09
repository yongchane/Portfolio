import test from "node:test";
import assert from "node:assert/strict";

import { getCanvasControlBarState } from "./canvas-control-bar.mjs";

test("getCanvasControlBarState exposes open and closed UI state", () => {
  const openState = getCanvasControlBarState(true);
  assert.equal(openState.toggleLabel, "Hide controls");
  assert.equal(openState.isContentVisible, true);

  const closedState = getCanvasControlBarState(false);
  assert.equal(closedState.toggleLabel, "Show controls");
  assert.equal(closedState.isContentVisible, false);
});
