# Analysis definitions

- **Power**: sum of the mean active power of phases A, B and C over each minute, in W.
- **Energy**: `W / 1000 / 60` kWh per observed minute. Missing minutes add nothing.
- **Local day**: Europe/Paris calendar day. A day has 1380, 1440 or 1500 minutes (DST).
- **Peak power**: highest one-minute mean power, with its UTC and Paris timestamps.
- **Base load**: 5th percentile of minute power over observed minutes (linear interpolation).
- **Average daily energy**: mean daily energy over *complete* local days only, meaning at
  least 95 % of the day's minutes observed. Partial first/last days and days hit by long
  gaps are excluded so they do not bias the average low.
- **Hourly series**: energy per hour with its count of observed minutes (60 = complete).
- **Daily profile**: mean power per local hour of day, Monday-Friday vs Saturday-Sunday.
- **Profile band**: for each group and hour, the 25th and 75th percentiles (linear interpolation)
  across local days of that day's mean power in the hour. One value per day, so the band shows
  day-to-day spread, not minute noise. Edges are configurable (`profile_band_*_percentile`).
- **Profile day counts**: number of Paris local days with at least one reading, per group
  (`weekday_days`, `weekend_days`). A day counts once however many hours it has; a partial first
  or last day counts. The day is the local date, so 00:30 Paris on Saturday is a weekend day.
- **Coverage**: observed minutes over the minutes between first and last reading, inclusive.
- **Gap**: a run of missing minutes strictly longer than 5 minutes. Gaps are reported, never
  interpolated.

## Supply voltage ("Qualité de service")
- **Rule** (client): nominal 220 V, tolerance ±10 %, so 198 V to 242 V. Both are settings
  (`AnalysisSettings.voltage`, defaults 220 and 10), exported in `dashboard.json` under
  `voltage.settings` together with the derived `lower_v` / `upper_v`. Nothing is hardcoded.
- **Minute voltage**: mean of the phases A, B, C that were measured that minute. A phase at 0 V is
  not measured (start-up artefact, see `docs/data-format.md`) and is left out; if all three are 0 V
  the minute has no voltage.
- **Out of range**: strictly below 198 V or strictly above 242 V. The bounds are compliant.
- **Missing minutes** (no reading, or no usable voltage) are neither compliant nor non-compliant.
  They are reported as `missing_minutes` / `coverage_pct` and never interpolated.
  `pct_time_in_range` is measured in-range minutes over measured minutes.
- **Excursion**: a run of out-of-range minutes in one direction (`below` / `above`). Runs of the
  same direction separated by **fewer than 5 minutes** (compliant or missing, setting
  `excursion_merge_minutes`) are merged into one excursion. `duration_min` runs from the first to
  the last out-of-range minute inclusive; `out_of_range_minutes` counts only the out-of-range ones.
  Start and end are given in Europe/Paris. `worst_value_v` is the lowest (below) or highest
  (above) minute voltage.
- **Daily series**: one point per Paris local day from the first to the last measured day (min,
  mean, max, out-of-range minutes). A day without data has `null` values. **Hourly series**:
  min / mean / max per UTC hour, a downsampled detail for the chart (about 1,000 points).
- **Not EN 50160.** This is a minute-by-minute check against the client's rule. The formal
  assessment uses 10-minute means and requires 95 % of a week within the range. Results must not
  be presented as legal compliance.
