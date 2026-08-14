# Wurlitzer 3210 Virtual Service Manual

Searchable visual archive and knowledge store assembled from photographs of the Wurlitzer Series 3200 service manual, specifically model 3210.

## Source policy

- Page images are the visual source of truth.
- OCR text is provided for discovery and may contain errors.
- OCR is generated from temporary oriented, grayscale derivatives. Each page records a quality status and confidence; poor and diagram-derived OCR is excluded from search and hidden in the reader.
- Schematics, terminal numbers, wire identifiers, contact states, dimensions, and part numbers must be verified against the image.
- `knowledge/` contains curated summaries with source-page references and confidence labels.
- Every catalog entry has an explicit clockwise `rotation` value (`0`, `90`, `180`, or `270`). The viewer applies it while leaving the original photograph and download unchanged. OCR is intentionally not regenerated until orientation review is approved.

## Open locally

Open `index.html` directly in a browser. No build step or server is required. This layout is also compatible with GitHub Pages.

## Contents

- `assets/pages/` — efficient original JPEG photographs
- `ocr/` — searchable OCR text per image
- `data/pages.json` — page catalog and provenance
- `knowledge/selection-sequence.md` — curated operating sequence
- `knowledge/troubleshooting.md` — symptom-oriented diagnostic notes
- `knowledge/project-summary.md` — project scope and digital-twin plan

## Known gaps

Section F pages 4F and 5F were not present in the supplied photographs. Several front-matter and Section E images do not expose a readable page number; the catalog marks these conservatively.

## Regenerate OCR

Requires ImageMagick and Tesseract 5 with English language data:

```bash
node scripts/run-ocr.mjs
node scripts/build-catalog.mjs
```

The original photographs are never modified. Raw TSV output is retained in `ocr/raw/` for quality review; it is not presented as verified transcription.
