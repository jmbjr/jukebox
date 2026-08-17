export function validateIndexRegistrationDefinition(definition) {
  if (!definition || definition.schemaVersion !== 1) throw new Error("Index-registration definition must use schemaVersion 1");
  for (const name of ["sources", "stages", "faults"]) if (!Array.isArray(definition[name])) throw new Error(`Missing ${name} array`);
  const unique = (items, name) => {
    const ids = items.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${name} id`);
  };
  unique(definition.sources, "source"); unique(definition.stages, "stage"); unique(definition.faults, "fault");
  const stages = new Set(definition.stages.map(({ id }) => id));
  const sources = new Set(definition.sources.map(({ id }) => id));
  for (const fault of definition.faults) if (!stages.has(fault.stage)) throw new Error(`Fault ${fault.id} references unknown stage ${fault.stage}`);
  for (const stage of definition.stages) for (const ref of stage.sourceRefs || []) {
    if (!sources.has(ref.sourceId)) throw new Error(`Stage ${stage.id} references unknown source ${ref.sourceId}`);
  }
  return true;
}

export class A1IndexRegistrationSimulation {
  constructor(definition, options = {}) {
    validateIndexRegistrationDefinition(definition);
    this.definition = definition;
    this.stageIndex = 0;
    this.faults = new Set(options.faults || []);
    this.faultById = new Map(definition.faults.map((fault) => [fault.id, fault]));
    for (const id of this.faults) if (!this.faultById.has(id)) throw new Error(`Unknown fault ${id}`);
    this.blocked = null;
    this.trace = [{ action: "motor-forward-boundary", stage: this.stage.id, status: "waiting" }];
  }

  get stage() { return this.definition.stages[this.stageIndex]; }

  advance() {
    if (this.blocked || this.stageIndex === this.definition.stages.length - 1) return this.snapshot();
    const fault = [...this.faults].map((id) => this.faultById.get(id)).find(({ stage }) => stage === this.stage.id);
    if (fault) {
      if (fault.stopReason === "selector-pin-stuck") this.stageIndex += 1;
      this.blocked = fault.stopReason;
      this.trace.push({ action: "advance", stage: this.stage.id, status: "blocked", stopReason: this.blocked });
      return this.snapshot();
    }
    this.stageIndex += 1;
    this.trace.push({ action: "advance", stage: this.stage.id, status: this.isComplete ? "boundary-reached" : "waiting" });
    return this.snapshot();
  }

  get isComplete() { return this.stage.id === "pin-registered"; }

  snapshot() {
    return {
      phase: this.blocked === "selector-pin-stuck" ? "letter-coil-energized" : this.stage.id,
      stageLabel: this.stage.label,
      instruction: this.stage.instruction || null,
      status: this.blocked ? "blocked" : this.isComplete ? "boundary-reached" : "waiting",
      stopReason: this.blocked,
      energized: [...(this.stage.energized || [])],
      observations: {
        driverSolenoid16: this.stageIndex >= 1 || this.blocked === "selector-failed-to-index",
        number1RockersIndexed: this.stageIndex >= 1 && this.blocked !== "selector-failed-to-index",
        ry1Released: this.stageIndex >= 2 || this.blocked === "ry4-pickup-path-open",
        ry4Relay: this.stageIndex >= 2,
        a15LetterCoil: this.stageIndex >= 3,
        a1SelectorPinReleased: this.stageIndex >= 3 && !this.blocked
      },
      activeFaults: [...this.faults].sort()
    };
  }
}

export function createA1IndexRegistrationSimulation(definition, options) {
  return new A1IndexRegistrationSimulation(definition, options);
}
