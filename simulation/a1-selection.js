function duplicates(items) {
  return [...new Set(items.filter((item, index) => items.indexOf(item) !== index))];
}

export function validateCircuitDefinition(definition) {
  if (!definition || definition.schemaVersion !== 1) {
    throw new Error("Circuit definition must use schemaVersion 1");
  }

  const collections = ["sources", "components", "paths", "faults"];
  for (const name of collections) {
    if (!Array.isArray(definition[name])) throw new Error(`Missing ${name} array`);
    const repeated = duplicates(definition[name].map(({ id }) => id));
    if (repeated.length) throw new Error(`Duplicate ${name} id: ${repeated.join(", ")}`);
  }

  const componentIds = new Set(definition.components.map(({ id }) => id));
  const pathIds = new Set(definition.paths.map(({ id }) => id));
  const sourceIds = new Set(definition.sources.map(({ id }) => id));

  for (const path of definition.paths) {
    for (const id of [...(path.elements || []), ...(path.energizes || [])]) {
      if (!componentIds.has(id)) throw new Error(`Path ${path.id} references unknown component ${id}`);
    }
    for (const id of path.requires || []) {
      if (!pathIds.has(id)) throw new Error(`Path ${path.id} requires unknown path ${id}`);
    }
    for (const ref of path.sourceRefs || []) {
      if (!sourceIds.has(ref.sourceId)) throw new Error(`Path ${path.id} references unknown source ${ref.sourceId}`);
    }
  }

  for (const fault of definition.faults) {
    if (fault.target !== "latch-mechanism" && !componentIds.has(fault.target)) {
      throw new Error(`Fault ${fault.id} references unknown target ${fault.target}`);
    }
  }
  return true;
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((item) => right.has(item));
}

export class A1SelectionSimulation {
  constructor(definition, options = {}) {
    validateCircuitDefinition(definition);
    this.definition = definition;
    this.componentById = new Map(definition.components.map((component) => [component.id, component]));
    this.faultById = new Map(definition.faults.map((fault) => [fault.id, fault]));
    this.faults = new Set(options.faults || []);
    for (const id of this.faults) {
      if (!this.faultById.has(id)) throw new Error(`Unknown fault ${id}`);
    }

    this.creditEstablished = false;
    this.selectedLetter = null;
    this.selectedNumber = null;
    this.latchMechanismActuated = false;
    this.energized = new Set();
    this.activePaths = new Set();
    this.contacts = {};
    this.trace = [];
    this.#stabilize("initial");
  }

  establishCredit() {
    this.creditEstablished = true;
    this.#stabilize("establish-credit");
    return this.snapshot();
  }

  select(letter, number) {
    this.selectedLetter = String(letter).toUpperCase();
    this.selectedNumber = String(number);
    this.#stabilize(`select-${this.selectedLetter}${this.selectedNumber}`);
    return this.snapshot();
  }

  runA1() {
    this.establishCredit();
    return this.select("A", "1");
  }

  snapshot() {
    const diagnosis = this.#diagnosis();
    return {
      ...diagnosis,
      creditEstablished: this.creditEstablished,
      selection: this.selectedLetter && this.selectedNumber
        ? `${this.selectedLetter}${this.selectedNumber}` : null,
      latchMechanismActuated: this.latchMechanismActuated,
      energized: [...this.energized].sort(),
      activePaths: [...this.activePaths].sort(),
      contacts: Object.fromEntries(Object.entries(this.contacts).sort(([a], [b]) => a.localeCompare(b))),
      activeFaults: [...this.faults].sort(),
      observations: {
        ry1Relay: this.energized.has("ry1-coil"),
        latchSolenoid: this.energized.has("latch-solenoid"),
        selectLamp: this.energized.has("select-lamp"),
        number1Coil: this.energized.has("number-1-coil"),
        lamp303: this.energized.has("lamp-303"),
        ry2Relay: this.energized.has("ry2-coil"),
        selectionMotorForward: this.energized.has("selection-motor-forward")
      }
    };
  }

  #forcedOpenTargets() {
    return new Set([...this.faults]
      .map((id) => this.faultById.get(id))
      .filter(({ type }) => type === "forced-open")
      .map(({ target }) => target));
  }

  #deriveContacts(energized) {
    const contacts = {
      "key-switch": this.creditEstablished,
      "selector-series-switches": true,
      "ry4-contact-9-1": true,
      "ry1-contact-8-12": energized.has("ry1-coil"),
      "ry1-contact-10-6": energized.has("ry1-coil"),
      "ry1-contact-9-5": energized.has("ry1-coil"),
      "letter-selector-a": this.selectedLetter === "A",
      "button-release-switch": true,
      "control-switch-5-4": !this.latchMechanismActuated,
      "control-switch-3-4": this.latchMechanismActuated,
      "letter-latch-switch-4-3": this.latchMechanismActuated && this.selectedLetter === "A",
      "number-latch-switch-3-4": this.latchMechanismActuated && this.selectedNumber === "1",
      "number-selector-switch-1": this.selectedNumber === "1",
      "ry2-contact-10-6": energized.has("ry2-coil"),
      "ry2-contact-8-12": energized.has("ry2-coil"),
      "selection-motor-thermostat": true
    };
    for (const target of this.#forcedOpenTargets()) {
      if (this.componentById.get(target)?.type === "contact") contacts[target] = false;
    }
    return contacts;
  }

  #evaluatePaths(contacts) {
    const activePaths = new Set();
    const energized = new Set();
    const forcedOpen = this.#forcedOpenTargets();
    let changed = true;

    while (changed) {
      changed = false;
      for (const path of this.definition.paths) {
        if (activePaths.has(path.id)) continue;
        if ((path.requires || []).some((id) => !activePaths.has(id))) continue;
        const conducts = path.elements.every((id) => {
          if (forcedOpen.has(id)) return false;
          const component = this.componentById.get(id);
          return component.type === "contact" ? contacts[id] === true : true;
        });
        if (!conducts) continue;
        activePaths.add(path.id);
        for (const id of path.energizes) energized.add(id);
        changed = true;
      }
    }
    return { activePaths, energized };
  }

  #stabilize(action) {
    for (let pass = 0; pass < 20; pass += 1) {
      const contacts = this.#deriveContacts(this.energized);
      const next = this.#evaluatePaths(contacts);
      let mechanismChanged = false;
      if (next.energized.has("latch-solenoid") && !this.latchMechanismActuated &&
          !this.faults.has("bound-latch-mechanism")) {
        this.latchMechanismActuated = true;
        mechanismChanged = true;
      }
      const stable = sameSet(next.energized, this.energized) &&
        sameSet(next.activePaths, this.activePaths) && !mechanismChanged;
      this.energized = next.energized;
      this.activePaths = next.activePaths;
      this.contacts = contacts;
      if (stable) {
        this.contacts = this.#deriveContacts(this.energized);
        this.trace.push({ action, ...this.snapshot() });
        return;
      }
    }
    throw new Error("Circuit did not reach a stable state after 20 passes");
  }

  #diagnosis() {
    if (this.energized.has("selection-motor-forward")) {
      return { phase: "selection-motor-forward", status: "boundary-reached", stopReason: null };
    }
    if (!this.creditEstablished) return { phase: "idle", status: "waiting", stopReason: "awaiting-credit" };
    if (!this.energized.has("ry1-coil")) return { phase: "credit-ready", status: "blocked", stopReason: "ry1-pickup-open" };
    if (!this.selectedLetter || !this.selectedNumber) return { phase: "keyboard-enabled", status: "waiting", stopReason: "awaiting-selection" };
    if (!this.latchMechanismActuated && !this.energized.has("latch-solenoid")) return { phase: "selection-entered", status: "blocked", stopReason: "latch-solenoid-path-open" };
    if (!this.latchMechanismActuated) return { phase: "latch-solenoid-energized", status: "blocked", stopReason: "latch-mechanism-did-not-move" };
    if (!this.energized.has("ry2-coil")) return { phase: "buttons-latched", status: "blocked", stopReason: "a1-registration-path-open" };
    return { phase: "ry2-energized", status: "blocked", stopReason: "selection-motor-path-open" };
  }
}

export function createA1Simulation(definition, options) {
  return new A1SelectionSimulation(definition, options);
}
