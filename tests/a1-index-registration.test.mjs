import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createA1IndexRegistrationSimulation, validateIndexRegistrationDefinition } from "../simulation/a1-index-registration.js";

const definition = JSON.parse(readFileSync(new URL("../data/circuits/a1-index-registration.json", import.meta.url), "utf8"));

test("the 200-selector registration model cites pages 20E, 21E, and 9B", () => {
  assert.equal(validateIndexRegistrationDefinition(definition), true);
  assert.deepEqual(definition.sources.map(({ pageLabel }) => pageLabel), ["20E", "21E", "9B"]);
});

test("healthy progression reaches the released A1 selector pin", () => {
  const simulation = createA1IndexRegistrationSimulation(definition);
  assert.equal(simulation.snapshot().phase, "motor-forward");
  simulation.advance();
  assert.equal(simulation.snapshot().phase, "number-indexed");
  simulation.advance();
  assert.equal(simulation.snapshot().phase, "ry4-energized");
  const state = simulation.advance();
  assert.equal(state.phase, "pin-registered");
  assert.equal(state.status, "boundary-reached");
  assert.equal(state.observations.a1SelectorPinReleased, true);
});

test("a bound rotating plate stops before number indexing", () => {
  const state = createA1IndexRegistrationSimulation(definition, { faults: ["bound-rotating-plate"] }).advance();
  assert.equal(state.phase, "motor-forward");
  assert.equal(state.stopReason, "selector-failed-to-index");
  assert.equal(state.observations.driverSolenoid16, true);
  assert.equal(state.observations.number1RockersIndexed, false);
});

test("an open RY-4 pickup path stops after the rockers index", () => {
  const simulation = createA1IndexRegistrationSimulation(definition, { faults: ["open-ry4-coil"] });
  simulation.advance();
  const state = simulation.advance();
  assert.equal(state.phase, "number-indexed");
  assert.equal(state.stopReason, "ry4-pickup-path-open");
  assert.equal(state.observations.ry1Released, true);
  assert.equal(state.observations.ry4Relay, false);
});

test("an open letter coil stops after RY-4 energizes", () => {
  const simulation = createA1IndexRegistrationSimulation(definition, { faults: ["open-a1-5-letter-coil"] });
  simulation.advance(); simulation.advance();
  const state = simulation.advance();
  assert.equal(state.phase, "ry4-energized");
  assert.equal(state.stopReason, "letter-coil-path-open");
  assert.equal(state.observations.a1SelectorPinReleased, false);
});

test("a stuck pin distinguishes an energized coil from mechanical release", () => {
  const simulation = createA1IndexRegistrationSimulation(definition, { faults: ["stuck-a1-selector-pin"] });
  simulation.advance(); simulation.advance();
  const state = simulation.advance();
  assert.equal(state.stopReason, "selector-pin-stuck");
  assert.equal(state.phase, "letter-coil-energized");
  assert.equal(state.observations.a15LetterCoil, true);
  assert.equal(state.observations.a1SelectorPinReleased, false);
});

test("identical registration actions produce identical states and traces", () => {
  const a = createA1IndexRegistrationSimulation(definition);
  const b = createA1IndexRegistrationSimulation(definition);
  for (let index = 0; index < 3; index += 1) { a.advance(); b.advance(); }
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.deepEqual(a.trace, b.trace);
});
