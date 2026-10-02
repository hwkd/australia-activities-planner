-- Live forecast (spec §11.1, tracker M16): one row per area and date, refreshed every 3 hours by the
-- Worker's Cron Trigger from Open-Meteo. Visitors read it through /data/forecast.json.
CREATE TABLE forecasts (
  area TEXT NOT NULL,            -- AREAS in src/lib/forecast.ts
  date TEXT NOT NULL,            -- YYYY-MM-DD, Sydney
  sky TEXT NOT NULL CHECK (sky IN ('sunny', 'cloudy', 'rainy', 'hot')),
  rain_chance INTEGER NOT NULL,  -- precipitation_probability_max, %
  rain_mm REAL NOT NULL,
  temp_max REAL NOT NULL,
  cloud REAL NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (area, date)
);
