# Frontend — AI Agent Instructions

Angular app that visualises electricity consumption data produced by `data-science/`.

## Start here
1. `npm install`
2. `npm start` — run locally
3. `npm run lint`, `npm test`, `npm run build` — quality checks

## Layers (top to bottom)
`components` → `services` → `models`. Components never call `HttpClient`;
only services talk to the API. Interfaces in `models/` mirror the API schema.

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

## Tests
- Use the project test runner's APIs only (no mixing frameworks).
- Fake async with a real async boundary and fake timers; assert exact values.
- A bug fix starts with a test that fails on the broken code.

## After every change
`npm run lint && npm test && npm run build`
Zero tolerance for lint errors and test regressions.
