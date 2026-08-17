export function validateScanStartDefinition(definition) {
  if (!definition || definition.schemaVersion !== 1) throw new Error("Scan-start definition must use schemaVersion 1");
  for (const name of ["sources", "stages", "faults"]) if (!Array.isArray(definition[name])) throw new Error(`Missing ${name} array`);
  for (const [name, items] of [["source", definition.sources], ["stage", definition.stages], ["fault", definition.faults]]) {
    const ids = items.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${name} id`);
  }
  const sourceIds = new Set(definition.sources.map(({ id }) => id));
  const stageIds = new Set(definition.stages.map(({ id }) => id));
  for (const stage of definition.stages) for (const ref of stage.sourceRefs || []) if (!sourceIds.has(ref.sourceId)) throw new Error(`Stage ${stage.id} references unknown source ${ref.sourceId}`);
  for (const fault of definition.faults) if (!stageIds.has(fault.stage)) throw new Error(`Fault ${fault.id} references unknown stage ${fault.stage}`);
  return true;
}

export class PinToScanStartSimulation {
  constructor(definition, options = {}) {
    validateScanStartDefinition(definition);
    this.definition = definition;
    this.stageIndex = 0;
    this.faults = new Set(options.faults || []);
    this.faultById = new Map(definition.faults.map((fault) => [fault.id, fault]));
    for (const id of this.faults) if (!this.faultById.has(id)) throw new Error(`Unknown fault ${id}`);
    this.blocked = null;
    this.degraded = null;
    this.trace = [{ action: "pin-release-boundary", stage: this.stage.id, status: "waiting" }];
  }

  get stage() { return this.definition.stages[this.stageIndex]; }
  get isComplete() { return this.stage.id === "scan-started" && !this.blocked; }

  advance() {
    if (this.blocked || this.isComplete) return this.snapshot();
    const fault = [...this.faults].map((id) => this.faultById.get(id)).find(({ stage }) => stage === this.stage.id);
    if (fault && this.stage.id !== "ry5-energized") {
      if (fault.id === "open-override-switch") this.stageIndex = 1;
      this.blocked = fault.stopReason;
    } else if (this.stage.id === "ry5-energized") {
      this.stageIndex = 3;
      if (fault?.branch === "chassis") this.blocked = fault.stopReason;
      if (fault?.branch === "turntable") this.degraded = fault.stopReason;
    } else {
      this.stageIndex += 1;
    }
    const state = this.snapshot();
    this.trace.push({ action: "advance", stage: state.phase, status: state.status, stopReason: state.stopReason });
    return state;
  }

  snapshot() {
    const motorAttempted = this.stageIndex >= 3;
    const turntableRunning = motorAttempted && this.degraded !== "turntable-path-open";
    const chassisScanning = motorAttempted && this.blocked !== "chassis-motor-path-open";
    const phase = this.blocked === "override-switch-open" ? "override-switch-open"
      : motorAttempted && this.blocked ? "scan-start-attempted" : this.stage.id;
    const stageLabel = this.blocked === "override-switch-open" ? "Wobble ring raised; override switch remained open"
      : this.blocked === "chassis-motor-path-open" ? "Turntable started; chassis scan path blocked"
      : this.degraded === "turntable-path-open" ? "Carrier scan started; turntable path blocked" : this.stage.label;
    return {
      phase,
      stageLabel,
      instruction: this.stage.instruction || null,
      status: this.blocked ? "blocked" : this.degraded ? "degraded" : this.isComplete ? "boundary-reached" : "waiting",
      stopReason: this.blocked || this.degraded,
      observations: {
        selectorPinReleased: true,
        wobbleRingRaised: this.stageIndex >= 1,
        overrideSwitchClosed: this.stageIndex >= 1 && this.blocked !== "override-switch-open",
        ry5Relay: this.stageIndex >= 2,
        turntableMotor: turntableRunning,
        chassisMotorForward: chassisScanning,
        recordCarrierScanning: chassisScanning
      },
      activeFaults: [...this.faults].sort()
    };
  }
}

export function createPinToScanStartSimulation(definition, options) {
  return new PinToScanStartSimulation(definition, options);
}
