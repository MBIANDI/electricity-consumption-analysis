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
- **Coverage**: observed minutes over the minutes between first and last reading, inclusive.
- **Gap**: a run of missing minutes strictly longer than 5 minutes. Gaps are reported, never
  interpolated.
