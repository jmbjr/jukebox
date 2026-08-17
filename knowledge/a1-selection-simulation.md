# A1 selection simulation

## Scope

The interactive A1 path follows a selection from credit establishment through releasing the A1 selector pin. It has two linked models so electrically stable paths and time-dependent mechanical events remain distinct:

1. Credit through energizing the selection-motor forward winding.
2. 200-selector number indexing, RY-4 pickup, letter-coil operation, and A1 pin release.
3. Wobble-ring and override-switch operation, RY-5 pickup, turntable start, and chassis-motor scan start.

## Manual basis

- Page 13E (`p027`), sequence steps 1–3: common and return conductors, RY-1 pickup/interlock, and latch-solenoid pickup.
- Page 14E (`p033`), sequence steps 3–6: control-switch transfer, Select lamp, A1 latch/number path, RY-2 pickup, latch hold, and selection-motor forward path.
- Page 20E (`p018`), sequence steps 6–9: 1-and-6 driver solenoid, number-1 indexing, RY-1 release, RY-4 pickup, and driver hold.
- Page 21E (`p022`), sequence step 10: A1–5 letter-coil circuit and A1 selector-pin release.
- Page 9B (`p044`), Figure 16 context: the 200 electric-selector mechanism associated with pin registration.
- Page 5B (`p024`): selector-pin spring, wobble ring, spacers, and override-switch operation.
- Page 16E (`p043`), record-changer steps 1–3: RY-5 pickup, turntable-motor circuit, and chassis-motor forward circuit.

Confidence: manual-verified for the stated sequence. The RY-2 and lamp 303 branch topology is a functional interpretation of the prose and is labeled as such in the circuit definition.

## Behavior

The evaluator repeatedly derives relay-controlled contact states and evaluates complete conductive paths until the state stabilizes. A latched mechanical movement persists after the initial solenoid pickup. Given the same actions and faults, it always produces the same state and action trace.

Supported fault classes in this path are forced-open electrical components, mechanical binding, and a stuck selector pin. Independent turntable and chassis-motor branches are evaluated separately so one branch is not falsely reported as stopped by a failure in the other. These are functional diagnostic scenarios, not resistance, timing, thermal, intermittent, or analog voltage simulations.

## Safety and authority

The simulation is an educational troubleshooting aid. The photographed manual page remains authoritative. It does not replace safe live-service procedures or electrical measurements by a qualified person.
