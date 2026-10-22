# Shelly minute data format

Findings from inspecting `data/shelly_minute_20260831_20261014.json` (personal data,
gitignored, never modified). Figures below come from a one-off inspection script.

## Structure
- Top level: one JSON array of 61,318 flat objects, one per minute. Single device
  (`shellypro3em63-a4f00fccaf68`, a Shelly Pro 3EM, three-phase meter: phases `a`, `b`, `c`).
- Period: 2026-08-31T16:33Z to 2026-10-14T22:59Z. Sorted, no duplicate timestamps.

## Fields
| Field | Meaning |
| --- | --- |
| `timestamp_utc` | Start of the minute, ISO 8601 UTC (`Z`). Source of truth for time. |
| `minute_locale` | Local time as a naive string. **Fixed UTC+1 all period** (never UTC+2), so it is *not* Europe/Paris during summer time. Ignored. |
| `{a,b,c}_act_power_moy_w_derive` | Mean active power over the minute, in W (derived). Never negative. |
| `{a,b}_act_power_min_w_mesure` / `{a,b,c}_act_power_max_w_mesure` | Measured min/max active power in the minute, W. Min/max can be negative (reverse flow), moy is clamped at 0. |
| `a_aprt_power_moy_va_approx` | Approximate apparent power, VA. |
| `{a,b,c}_current_moy_a_mesure`, `{a,b,c}_voltage_moy_v_mesure` | Mean current (A) and voltage (V). Voltage is 0 for 61 rows. |
| `{a,b,c}_pf_moy_reconstruit` | Reconstructed power factor; null on 7 (a) and 4 (b) rows. |
| `freq_hz_indisponible`, `rssi_db_indisponible` | Always null. Ignored. |

## Semantics
- `*_act_power_moy_w_derive` is **mean power in W per minute**, not a cumulative counter
  and not energy. No counter resets exist because there is no counter.
- Energy per minute: `E_kWh = P_W / 1000 / 60`.
- Phase C is almost always 0 W (mean 0.04 W, max 846 W): effectively unused.

## Quality
- Expected 63,747 minutes, found 61,318: coverage 96.19 %.
- 30 gaps longer than 5 minutes; the longest are 20 h 09 min (2026-09-23), 8 h 22 min
  (2026-09-04), 2 h 39 min, 1 h 39 min, 1 h 26 min, 1 h 21 min.
- Negative values: only in measured `min`/`max` columns (phase A min: 20 rows).
- Outliers: naive three-phase total peaks at 8.65 kW on 2026-09-13T07:43Z.

## Voltage (supply quality)
Inspected for the "Qualité de service" section.
- Fields: `a_voltage_moy_v_mesure`, `b_voltage_moy_v_mesure`, `c_voltage_moy_v_mesure`. Unit V,
  phase-to-neutral, **mean over the minute, measured** (`moy`, `mesure`). One value per phase per
  minute; no min/max voltage columns. No nulls.
- Typical values: median 227.2 V (all phases), 1 %-99 % range about 204.5-237.2 V,
  extremes 180.4 V and 246.1 V. The three phases are almost identical (correlation >= 0.998,
  median gap 0.1 V, maximum gap 4 V).
- **Zeros**: phases A and B read 0 V on 61 rows, all in the first hour of the file
  (2026-08-31T16:33Z to 17:33Z) while phase C reads about 236 V and the meter reports
  current and power. They are a start-up artefact of the measurement, not an outage. Phase C
  has no zero. Zeros are never treated as voltages.
- Out of range against 198-242 V, on rows where all phases are valid: phase A 68 below / 12
  above, B 72 / 9, C 67 / 11. Mean of the three phases: 69 / 11. 84 minutes have at least one
  phase out of range.
- No value below 100 V other than the zeros: no sign of a real outage.

## Assumptions (v1)
1. Total power = phase A + B + C mean power.
2. Time is read from `timestamp_utc`; local days use Europe/Paris (CEST to CET switch on
   2026-10-25 is after the data ends, but handled and tested).
3. Gaps are reported, never interpolated: missing minutes contribute no energy.
4. Period shown in the footnote is derived from `source.period_start_utc` / `period_end_utc` in
   Europe/Paris. The file name uses UTC dates (`..._20261014`), but its last minute is
   2026-10-14T22:59Z, i.e. 00:59 on 15 Oct in Paris (CEST), so the footnote ends on 15 Oct and the
   daily charts end with a 60-minute partial day. This is a UTC-to-local effect, not extra data.
