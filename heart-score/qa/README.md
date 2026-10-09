# Heart Score OMR: independent image E2E

This is a real Chromium file-upload test. It loads `ai/index.html`, follows its
iframe/bootstrap, runs the pinned ONNX model and WASM runtime, then compares the
**actual loaded editor state**, not just the decoder's counters.

The public main Heart Score editor is unchanged. Only the AI beta points to v702.
The model and ground truth are never used to fabricate output notes.

## Reproduce without manual uploads

The source fixture is the user's existing `1000024367.jpg` (SHA256 in
`doremi-ground-truth.json`). Keep it private/outside Git; reuse the same file.
The full image is deliberately not committed to the public repository.

```sh
cd heart-score/qa
npm ci --no-audit --no-fund
npx playwright install chromium
node prepare-runtime.cjs
node omr-image-e2e.cjs --fixture /absolute/path/1000024367.jpg --runtime .runtime --output /absolute/path/results
```

`--browser /path/to/chromium` uses an existing browser installation.
`--mobile` uses a 412x915 touch viewport (browser emulation, not a physical phone).
`--url https://ulmoa0701-a11y.github.io/ulmoa-sam/heart-score/ai/`
tests the deployed page with the same cached dependencies.
The QA server, browser and runtime run locally, without a paid service.

- Pinned dependencies are served from the runtime cache at their original URLs;
  production source files are not rewritten or patched by the test.
- Full mode includes the optional title/lyrics OCR. `--core-only` excludes that
  ancillary OCR and is explicitly labeled in the report.
- `--variant pdf-a4` allows a PDF of the same score without the JPEG hash check;
  all note/rhythm checks remain mandatory.
- `--variant missing-dot --expect-reject` expects an altered score to be visibly
  rejected, without a success state. This is a rejection test, not recognition
  accuracy evidence for the changed score.
- Every run writes a JSON report and screenshot. Missing inputs/dependencies,
  browser exceptions, wrong notes, wrong rhythm, or a rejection in a positive
  case cause a nonzero exit code. A previous demo score cannot pass the checks.

## What is checked

Five body staves; per-line measures 4/4/4/4/3; 19 measures; 70 notes; four rests;
4/4 meter; all **74 ordered note/rest symbols**, including octave, F#/G#/Bb and
exact durations. The separate upper example staff is excluded. Repeats are kept
as written, not expanded into playback repetitions.

The ground truth was manually transcribed from the supplied image, independently
of the model output. The validator's own tests prove that wrong pitch, a lost
accidental, a rest changed to a note, or wrong durations that still sum to four
beats cannot pass.

## CI meaning

`Heart Score OMR QA` runs syntax/consensus/validator unit tests. Its green status
is **not** proof of image E2E. See `E2E-LATEST.json` for recorded real browser runs.
A fresh E2E run requires the private fixture bytes via the command above; it does
not silently skip an absent fixture or substitute synthetic staff coordinates.
The dependency-bundle workflow now discovers the active AI version instead of
bundling obsolete v692 code.

## Known limits

This regression establishes accuracy for the supplied single-melody 4/4 scan and
an image-only A4 PDF containing it. It does not establish general OMR accuracy,
polyphony, different meters, skewed photos, all PDF types, or all browsers.
Lyrics are conservative OCR suggestions and are not covered by musical accuracy
assertions. Image-only PDF extraction retains native resolution; text/vector or
rotated PDFs use the raster fallback and must pass the same quality gate.
The beta stops when visual durations are uncertain or measure sums disagree;
it no longer forces geometric note spacing into four beats on the scan path.
