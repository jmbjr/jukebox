import { createA1Simulation } from "./simulation/a1-selection.js";
import { createA1IndexRegistrationSimulation } from "./simulation/a1-index-registration.js";

const [definition, registrationDefinition] = await Promise.all([
  fetch("data/circuits/a1-selection-start.json", { cache: "no-store" }).then((response) => response.json()),
  fetch("data/circuits/a1-index-registration.json", { cache: "no-store" }).then((response) => response.json())
]);
const byId = (id) => document.getElementById(id);
let simulation, registration;

const observationLabels = {
  ry1Relay: "RY-1 relay", latchSolenoid: "Latch solenoid", selectLamp: "Select lamp",
  number1Coil: "Number 1 coil", lamp303: "Lamp 303", ry2Relay: "RY-2 relay",
  selectionMotorForward: "Selection motor forward", driverSolenoid16: "Driver solenoids 1 & 6",
  number1RockersIndexed: "Number-1 rockers indexed", ry1Released: "RY-1 released",
  ry4Relay: "RY-4 relay", a15LetterCoil: "A1–5 letter coil",
  a1SelectorPinReleased: "A1 selector pin released"
};
const reasonLabels = {
  "awaiting-credit": "Waiting for credit to close the key-switch path.",
  "awaiting-selection": "RY-1 is energized. Choose A1 to continue.",
  "ry1-pickup-open": "RY-1 cannot pick up through the credit path.",
  "latch-solenoid-path-open": "The latch-solenoid pickup path is open.",
  "latch-mechanism-did-not-move": "The solenoid is energized, but the latch mechanism did not move.",
  "a1-registration-path-open": "The A1 latch/number path cannot energize RY-2.",
  "selection-motor-path-open": "RY-2 is energized, but the motor-forward path is open.",
  "driver-solenoid-path-open": "The 1-and-6 driver-solenoid path is open.",
  "selector-failed-to-index": "The motor is energized, but the plate/quadrant did not reach number-1 alignment.",
  "ry4-pickup-path-open": "The rockers indexed, but the RY-4 pickup path is open.",
  "letter-coil-path-open": "RY-4 energized, but the A1–5 letter-coil path is open.",
  "selector-pin-stuck": "The letter-coil stage was reached, but the A1 selector pin did not release."
};

byId("fault").insertAdjacentHTML("beforeend", `<optgroup label="Credit and motor start">${definition.faults.map((fault) => `<option value="${fault.id}">${fault.label}</option>`).join("")}</optgroup><optgroup label="Indexing and pin registration">${registrationDefinition.faults.map((fault) => `<option value="${fault.id}">${fault.label}</option>`).join("")}</optgroup>`);

function reset() {
  const selectedFault = byId("fault").value;
  simulation = createA1Simulation(definition, { faults: definition.faults.some(({ id }) => id === selectedFault) ? [selectedFault] : [] });
  registration = createA1IndexRegistrationSimulation(registrationDefinition, { faults: registrationDefinition.faults.some(({ id }) => id === selectedFault) ? [selectedFault] : [] });
  render();
}

function render() {
  const startState = simulation.snapshot();
  const inRegistration = startState.status === "boundary-reached";
  const registrationState = registration.snapshot();
  const state = inRegistration ? registrationState : startState;
  byId("statusBadge").className = state.status;
  byId("statusBadge").textContent = state.status === "boundary-reached" ? "Reached" : state.status;
  byId("phase").textContent = state.phase.replaceAll("-", " ");
  byId("stopReason").textContent = state.stopReason ? reasonLabels[state.stopReason]
    : state.status === "boundary-reached" ? "The selector pin is released; the registration boundary has been reached."
    : state.instruction || "Continue the sequence.";
  byId("credit").disabled = startState.creditEstablished;
  byId("selectA1").disabled = !startState.creditEstablished || startState.selection === "A1";
  byId("advanceSelector").hidden = !inRegistration;
  byId("advanceSelector").disabled = registrationState.status === "blocked" || registrationState.status === "boundary-reached";
  byId("advanceSelector").textContent = registrationState.phase === "motor-forward" ? "Advance to number index" : registrationState.phase === "number-indexed" ? "Release RY-1 / energize RY-4" : "Energize letter coil / release pin";
  const observations = inRegistration ? { ...startState.observations, ...registrationState.observations } : startState.observations;
  byId("observations").innerHTML = Object.entries(observations).map(([id, on]) =>
    `<div class="observation ${on ? "on" : "off"}"><span aria-hidden="true"></span><strong>${observationLabels[id]}</strong><small>${on ? "energized" : "off"}</small></div>`
  ).join("");
  const activePaths = inRegistration
    ? [...startState.activePaths.map((id) => definition.paths.find((path) => path.id === id).label), registrationState.stageLabel]
    : startState.activePaths.map((id) => definition.paths.find((path) => path.id === id).label);
  byId("paths").innerHTML = activePaths.length
    ? activePaths.map((label) => `<li>${label}</li>`).join("")
    : "<li>No complete path is conducting.</li>";
  const trace = [...simulation.trace, ...(inRegistration ? registration.trace : [])];
  byId("trace").innerHTML = trace.map((entry) =>
    `<li><strong>${entry.action.replaceAll("-", " ")}</strong><span>${(entry.phase || entry.stage).replaceAll("-", " ")}</span></li>`
  ).join("");
}

byId("reset").onclick = reset;
byId("fault").onchange = reset;
byId("credit").onclick = () => { simulation.establishCredit(); render(); };
byId("selectA1").onclick = () => { simulation.select("A", "1"); render(); };
byId("advanceSelector").onclick = () => { registration.advance(); render(); };
reset();
