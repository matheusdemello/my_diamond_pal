# My Diamond Pal

Deterministic, explainable diamond analysis app for GitHub Pages.

## Features

- Single-diamond mode and side-by-side compare mode.
- Fixed-rule scoring engine (no ML, no random behavior).
- Outputs:
  - Shine Grade (A/B/C/D/F)
  - Brightness score (0-100)
  - Fire score (0-100)
  - Risk score (0-100)
  - HCA-like deterministic result for round diamonds:
    - Light Return / Fire / Scintillation / Spread ratings
    - Lower-is-better total score and recommendation band
  - Maximum Shine Zone checklist
  - Red-flag list
  - Spread/face-up indicator (when carat + diameter/measurements are present)
  - Value check from local editable benchmarks
- Value benchmark is USD-only (non-USD inputs are flagged as non-comparable)
- Research-based screening panel (round):
  - GIA proportion screening ranges
  - HCA-style reject threshold (`<= 2.5` target)
- Compare mode:
  - Winner by category (Brightness/Fire/Risk/HCA-like/Value)
  - Deterministic `Too close to call` when score gap is 3 or less
  - Top 3 pros/cons per diamond

## Default Prefill Profile

The form now starts with a practical default profile to speed up testing:

- Round, GIA, Excellent, H / VS2
- Table 56, Depth 61.8, Crown 34.5, Pavilion 40.8
- Girdle Medium, Culet None
- Star 50, Lower Halves 78
- Polish/Symmetry Excellent, Fluorescence None
- Use `Start Real Evaluation` / `Clear` actions to remove sample values quickly.

## Sample vs Real Mode

- The app loads a sample profile for convenience.
- If inputs match the built-in sample profile, results are marked as `Sample-Like`.
- For purchasing decisions, replace all key fields with certificate values.

## Maximum Shine Zone Rubric

Targets encoded in `engine/rubric.js`:

- Table: 54-58 (bonus 55-57)
- Depth: 60.5-62.5 (bonus 61-62)
- Crown angle: 34.0-35.0 (ideal 34.5)
- Pavilion angle: 40.6-40.9 (ideal 40.8)
- Preferred girdle: Thin-Medium / Medium
- Preferred culet: None / Very Small
- Star: 45-55 (if provided)
- Lower halves: 75-80 (bonus 77-80)
- Polish/Symmetry: Excellent preferred
- Fluorescence: None/Faint preferred
- Avoid-list red flags:
  - depth > 63 or < 59
  - table > 60 or < 53
  - pavilion >= 41.2
  - very thick/very thin girdle
  - hazy/milky flagged

## Scoring Philosophy

- Brightness starts from a base score and is adjusted mostly by pavilion angle, depth, and crown/pavilion pairing distance to (34.5, 40.8).
- Fire starts from a base score and is adjusted mostly by crown angle and table interaction, then star/lower-half fine-tuning.
- Risk starts low and increases with avoid-list or out-of-zone geometry, while preferred finish details can lower risk.
- Overall score = weighted blend of Brightness, Fire, and Safety (`100 - Risk`).
- Grade mapping:
  - A: >= 90 and no red flags
  - B: 80-89
  - C: 70-79
  - D: 60-69
  - F: < 60 or major red-flag combo

## Project Structure

```text
.
├── index.html
├── styles.css
├── app.js
├── assets/
│   └── favicon.svg
├── engine/
│   ├── rubric.js
│   ├── rules.js
│   └── rules.test.mjs
├── data/
│   └── benchmarks.json
└── .github/workflows/deploy.yml
```

## Run Locally

Option 1 (quick): open `index.html` in a browser.

Option 2 (recommended): run a tiny local static server so benchmark loading works reliably.

```bash
cd diamond_checker/my_diamond_pal
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Edit Benchmarks (offline value logic)

File: `data/benchmarks.json`

Each band is matched by:

- `shape`
- `carat_min`/`carat_max`
- `color_best`/`color_worst`
- `clarity_best`/`clarity_worst`
- `cut_grades`

And returns deterministic price/ct band:

- `price_per_carat_min`
- `price_per_carat_max`

If no band matches, UI shows `No reference band available`.

## Determinism

- No network pricing calls.
- No random number generation.
- Fixed thresholds and weighting in `engine/rubric.js`.
- Same input always returns the same output.

## Lightweight Test

```bash
node engine/rules.test.mjs
```

## GitHub Pages Deploy

The workflow `.github/workflows/deploy.yml` deploys this static site from the repository root via GitHub Actions.

1. Push repository to GitHub.
2. In repo settings, open **Pages**.
3. Set source to **GitHub Actions**.
4. Push to `main` to trigger deployment.

## License

MIT (see `LICENSE`).
