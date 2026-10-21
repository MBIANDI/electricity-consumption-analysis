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

## Assumptions (v1)
1. Total power = phase A + B + C mean power.
2. Time is read from `timestamp_utc`; local days use Europe/Paris (CEST to CET switch on
   2026-10-25 is after the data ends, but handled and tested).
3. Gaps are reported, never interpolated: missing minutes contribute no energy.
