# Project summary

## Machine

- Manufacturer: The Wurlitzer Company, North Tonawanda, New York
- Model: 3210
- Family: Series 3200
- Configuration: 200-selection electromechanical phonograph
- Input shown on backplate: 115 V, 60 cycles
- Amplifier: Model 548

## Goal

Create a GitHub Pages single-page application that can play songs while acting as a semi-accurate functional digital twin. It should visualize electrical and mechanical states, allow slow-motion and single-step operation, expose virtual multimeter test points, inject faults, and explain why a sequence did or did not advance.

## Modeling approach

Use a functional digital twin before detailed physics:

1. Model contacts, relays, coils, solenoids, motors, lamps, fuses and numbered conductors.
2. Model constrained mechanical states: button latch, rotating plate, rocker alignment, selector pin, wobble ring, record scan, load, play and return.
3. Drive SVG animation from model state rather than embedding behavior in the artwork.
4. Preserve the manual's wire numbers and relay-contact notation.
5. Treat the photographed diagrams as authoritative; OCR is only a search aid.

## Current symptom and working boundary

Pressing the selection buttons reportedly does not result in record selection. Manually moving an unidentified rear mechanism allows playback. This suggests much of the downstream changer/playback mechanism works and places initial attention on the credit, keyboard latch, selector control and selector-pin registration chain. This is a hypothesis, not a confirmed diagnosis.

## Information still useful

- Whether credit is visibly established
- Whether the Select/Make Selection lamp illuminates
- Whether letter and number buttons remain latched
- Whether the latch solenoid clicks or moves
- Whether junction-box lamp No. 303 flashes, remains lit or stays dark
- A photo/video identifying exactly what is moved manually
- Section F pages 4F and 5F, if available
