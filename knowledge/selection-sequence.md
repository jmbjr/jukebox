# Selection and changer sequence

Curated from Section E sequence-of-operations pages. Verify conductor and contact identifiers against the page images before live testing.

## Selection sequence

1. A coin advances the credit mechanism and closes the key switch.
2. The key switch and selector series switches permit RY-1 to energize and interlock.
3. Through RY-1, the letter-selector path, button-release switch, latch solenoid and control switch, the latch solenoid energizes.
4. The control switch changes state; its resistor limits latch-solenoid holding current and the Select lamp circuit illuminates.
5. Selecting a letter closes latch-switch paths and energizes RY-2.
6. RY-2 interlocks the latch solenoid.
7. The selected number energizes the appropriate driver solenoid; for intermediate positions, the index solenoid stops the rotating plate at the required rocker alignment.
8. RY-2 releases RY-1; timing components briefly hold RY-1 so indexing can complete.
9. RY-4 energizes and interlocks the selected driver-solenoid path.
10. The corresponding letter selector coil energizes and releases a selector pin.
11. Counter/free-play and cancel-solenoid operations deduct one credit and release the keyboard latch.
12. The number selector coil energizes and releases the selected pin.
13. The selection motor reverses, returning the number quadrant, start switch and reverse switch to rest.

## Record-changer sequence

1. A released selector pin moves the wobble/override mechanism and energizes RY-5.
2. RY-5 starts the turntable motor and powers the chassis-motor forward path.
3. The chassis scans the record carrier and selector cranks.
4. The carriage switch energizes and interlocks RY-6.
5. RY-6 changes the chassis-motor direction through the play/transfer circuits.
6. Transfer, loading, play and trip switches govern loading, playback and return.
7. At cycle completion, the transfer switch returns to rest and RY-5 releases.

## Digital-twin state names

`rest → credit-ready → keyboard-enabled → letter-latched → number-indexed → pin-written → selector-returning → scan-start → carrier-found → record-loading → playing → record-returning → rest`
