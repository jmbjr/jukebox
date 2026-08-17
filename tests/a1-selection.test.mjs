import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createA1Simulation, validateCircuitDefinition } from "../simulation/a1-selection.js";

const definition = JSON.parse(readFileSync(
  new URL("../data/circuits/a1-selection-start.json", import.meta.url), "utf8"
));

test("the curated definition is internally valid and cites both manual pages", () => {
  assert.equal(validateCircuitDefinition(definition), true);
  assert.deepEqual(definition.sources.map(({ pageLabel }) => pageLabel), ["13E", "14E"]);
});

test("credit establishes RY-1 and enables the keyboard before a selection", () => {
  const simulation = createA1Simulation(definition);
  const state = simulation.establishCredit();
  assert.equal(state.phase, "keyboard-enabled");
  assert.equal(state.stopReason, "awaiting-selection");
  assert.equal(state.observations.ry1Relay, true);
  assert.equal(state.observations.selectionMotorForward, false);
});

test("healthy A1 reaches the selection-motor-forward boundary", () => {
  const simulation = createA1Simulation(definition);
  const state = simulation.runA1();
  assert.equal(state.phase, "selection-motor-forward");
  assert.equal(state.status, "boundary-reached");
  assert.equal(state.latchMechanismActuated, true);
  assert.deepEqual(state.observations, {
    ry1Relay: true,
    latchSolenoid: true,
    selectLamp: true,
    number1Coil: true,
    lamp303: true,
    ry2Relay: true,
    selectionMotorForward: true
  });
  assert.ok(state.activePaths.includes("latch-solenoid-hold"));
  assert.ok(state.activePaths.includes("selection-motor-forward"));
});

test("an open key switch blocks RY-1 pickup", () => {
  const state = createA1Simulation(definition, { faults: ["open-key-switch"] }).runA1();
  assert.equal(state.stopReason, "ry1-pickup-open");
  assert.equal(state.observations.ry1Relay, false);
});

test("an open latch winding stops before mechanical operation", () => {
  const state = createA1Simulation(definition, { faults: ["open-latch-solenoid"] }).runA1();
  assert.equal(state.stopReason, "latch-solenoid-path-open");
  assert.equal(state.observations.ry1Relay, true);
  assert.equal(state.observations.latchSolenoid, false);
  assert.equal(state.latchMechanismActuated, false);
});

test("a bound latch distinguishes electrical pickup from mechanical movement", () => {
  const state = createA1Simulation(definition, { faults: ["bound-latch-mechanism"] }).runA1();
  assert.equal(state.stopReason, "latch-mechanism-did-not-move");
  assert.equal(state.observations.latchSolenoid, true);
  assert.equal(state.latchMechanismActuated, false);
  assert.equal(state.observations.ry2Relay, false);
});

test("an open number coil blocks A1 registration and RY-2", () => {
  const state = createA1Simulation(definition, { faults: ["open-number-1-coil"] }).runA1();
  assert.equal(state.stopReason, "a1-registration-path-open");
  assert.equal(state.latchMechanismActuated, true);
  assert.equal(state.observations.ry2Relay, false);
});

test("an open RY-2 motor contact stops after RY-2 energizes", () => {
  const state = createA1Simulation(definition, { faults: ["open-ry2-motor-contact"] }).runA1();
  assert.equal(state.stopReason, "selection-motor-path-open");
  assert.equal(state.observations.ry2Relay, true);
  assert.equal(state.observations.selectionMotorForward, false);
});

test("invalid component references are rejected", () => {
  const invalid = structuredClone(definition);
  invalid.paths[0].elements.push("missing-component");
  assert.throws(() => validateCircuitDefinition(invalid), /unknown component missing-component/);
});

test("identical inputs produce identical snapshots and traces", () => {
  const first = createA1Simulation(definition);
  const second = createA1Simulation(definition);
  assert.deepEqual(first.runA1(), second.runA1());
  assert.deepEqual(first.trace, second.trace);
});
