import test from "node:test";
import assert from "node:assert/strict";

import {
  AgentState,
  AgentStateEvent,
  InvalidStateTransitionError,
  StateMachine,
} from "../src/core/state.js";

test("StateMachine follows the normal chat -> tool -> chat -> output flow", () => {
  const machine = new StateMachine();

  machine.start({ reason: "begin turn" });
  machine.needTool({ reason: "model requested tool" });
  machine.toolSucceeded({ reason: "tool call succeeded" });
  machine.respond({ reason: "final answer ready" });

  assert.equal(machine.state, AgentState.Output);
  assert.equal(machine.previous, AgentState.Chat);
  assert.equal(machine.getHistory().length, 4);
});

test("StateMachine supports error recovery flow", () => {
  const machine = new StateMachine();

  machine.start();
  machine.needTool();
  machine.toolFailed({ reason: "tool timeout" });
  machine.errorHandled({ reason: "error returned to model" });

  assert.equal(machine.state, AgentState.Chat);
  assert.equal(machine.previous, AgentState.Error);
});

test("StateMachine rejects invalid transitions", () => {
  const machine = new StateMachine();

  assert.throws(
    () => machine.respond(),
    (error: unknown) =>
      error instanceof InvalidStateTransitionError &&
      error.state === AgentState.Init &&
      error.event === AgentStateEvent.Respond,
  );
});

test("StateMachine can reset from terminal state", () => {
  const machine = new StateMachine();

  machine.start();
  machine.respond();
  machine.finish();
  machine.reset({ reason: "start a fresh session" });

  assert.equal(machine.state, AgentState.Init);
  assert.equal(machine.previous, AgentState.End);
});
