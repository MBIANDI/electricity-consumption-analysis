# Frontend — AI Agent Instructions

Angular app that visualises electricity consumption data produced by `data-science/`.

## Start here
1. `npm install`
2. `npm start` — run locally
3. `npm run lint`, `npm test`, `npm run build` — quality checks

## Layers (top to bottom)
`components` → `services` → `models`. Components never call `HttpClient`;
only services talk to the API. Interfaces in `models/` mirror the API schema.

## Views and routes (lazy-loaded standalone components, see `app.routes.ts`)
| Path | View |
|---|---|
| `/` | Home: title, links to the three views, overview (KPIs) |
| `/consommation` | Daily / hourly energy |
| `/profil-journalier` | Average daily profile, weekday vs weekend |
| `/qualite-des-donnees` | Coverage and gaps |

Any other path redirects to `/`. The three views share `PageLayout` (compact header with a link
to `/` and the nav). UI strings live in `services/ui-strings.ts`; route paths and nav labels in
`services/navigation.ts`.

## Coding conventions
- Standalone components with `ChangeDetectionStrategy.OnPush`.
- Template state is a `signal()`, `computed()`, `input()` or `model()`; never a
  plain field written from a callback.
- TypeScript strict mode; no `any`.
- Use the path aliases from `tsconfig.json`; reuse `core`/`shared` before adding
  new abstractions.
- Use one charting library only: Apache ECharts via `ngx-echarts` (wrapped by `components/shared/chart.ts`).
- Timestamps arrive in UTC; display them in Europe/Paris. Always show units (kWh, kW).
- Every chart handles loading, error and empty states.
- Formatting follows `.editorconfig` (2 spaces, LF, max 120 columns).

## Design rules
- Page background is light blue (`--color-sky`), set on `html` and `body`. Content sits on white cards
  (`.card`: 1px border, radius `--radius` = 4px at most, at most the very subtle `--shadow-card`).
  Content is at most 75rem wide. Do not go back to a white page or to rounded or heavy-shadow cards.
- Colours live in `styles/_tokens.scss` only. The one exception is `components/shared/chart-theme.ts`
  (canvas cannot read CSS variables); keep the two in sync. Secondary text must reach AA (4.5:1) on
  both the sky background and white.
- Accent blue is for hover, focus and the key insight; never decorative.
- Georgia headings and KPI values use lining figures (`font-variant-numeric: lining-nums`, set on `body`).
- A number and its unit are separated by a no-break space (U+00A0), and "week-end" is written with a
  non-breaking hyphen (U+2011), so titles never split them. Use the helpers in `services/format.ts`
  and `UI.weekend`.
- Every number shown (text, axis ticks, tooltips, labels) goes through `Intl` with `fr-FR`.
- A line style (solid / dashed) never relies on colour alone: show a line sample next to its name.

## Tests
- Use the project test runner's APIs only (no mixing frameworks).
- Fake async with a real async boundary and fake timers; assert exact values.
- A bug fix starts with a test that fails on the broken code.

## After every change
`npm run lint && npm test && npm run build`
Zero tolerance for lint errors and test regressions.
