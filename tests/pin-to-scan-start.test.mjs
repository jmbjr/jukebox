import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPinToScanStartSimulation, validateScanStartDefinition } from "../simulation/pin-to-scan-start.js";

const definition = JSON.parse(readFileSync(new URL("../data/circuits/pin-to-scan-start.json", import.meta.url), "utf8"));

test("scan-start model validates and cites 16E and the 5B mechanism", () => {
  assert.equal(validateScanStartDefinition(definition), true);
  assert.deepEqual(definition.sources.map(({ pageLabel }) => pageLabel), ["16E", "5B"]);
});

test("healthy sequence reaches record-carrier scan start", () => {
  const simulation = createPinToScanStartSimulation(definition);
  simulation.advance(); simulation.advance();
  const state = simulation.advance();
  assert.equal(state.phase, "scan-started");
  assert.equal(state.status, "boundary-reached");
  assert.equal(state.observations.turntableMotor, true);
  assert.equal(state.observations.recordCarrierScanning, true);
});

test("a bound wobble ring stops after pin release", () => {
  const state = createPinToScanStartSimulation(definition, { faults: ["bound-wobble-ring"] }).advance();
  assert.equal(state.stopReason, "wobble-ring-did-not-move");
  assert.equal(state.observations.selectorPinReleased, true);
  assert.equal(state.observations.wobbleRingRaised, false);
});

test("an open override switch distinguishes movement from contact closure", () => {
  const state = createPinToScanStartSimulation(definition, { faults: ["open-override-switch"] }).advance();
  assert.equal(state.stopReason, "override-switch-open");
  assert.equal(state.observations.wobbleRingRaised, true);
  assert.equal(state.observations.overrideSwitchClosed, false);
  assert.equal(state.observations.ry5Relay, false);
});

test("an open transfer contact blocks RY-5 after override closure", () => {
  const simulation = createPinToScanStartSimulation(definition, { faults: ["open-transfer-3-2"] });
  simulation.advance();
  const state = simulation.advance();
  assert.equal(state.stopReason, "ry5-pickup-path-open");
  assert.equal(state.observations.overrideSwitchClosed, true);
  assert.equal(state.observations.ry5Relay, false);
});

test("a turntable fault does not falsely stop the independent chassis scan branch", () => {
  const simulation = createPinToScanStartSimulation(definition, { faults: ["open-turntable-motor"] });
  simulation.advance(); simulation.advance();
  const state = simulation.advance();
  assert.equal(state.status, "degraded");
  assert.equal(state.stopReason, "turntable-path-open");
  assert.equal(state.observations.turntableMotor, false);
  assert.equal(state.observations.recordCarrierScanning, true);
});

test("an open loading switch allows turntable start but blocks carrier scan", () => {
  const simulation = createPinToScanStartSimulation(definition, { faults: ["open-loading-switch"] });
  simulation.advance(); simulation.advance();
  const state = simulation.advance();
  assert.equal(state.stopReason, "chassis-motor-path-open");
  assert.equal(state.observations.turntableMotor, true);
  assert.equal(state.observations.recordCarrierScanning, false);
});

test("identical actions produce identical scan-start states and traces", () => {
  const a = createPinToScanStartSimulation(definition);
  const b = createPinToScanStartSimulation(definition);
  for (let index = 0; index < 3; index += 1) { a.advance(); b.advance(); }
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.deepEqual(a.trace, b.trace);
});
