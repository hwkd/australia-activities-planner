import { useEffect } from "react";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { $weather, bindThemeToWeather, type Weather } from "~/stores/weather";
import { track } from "~/lib/analytics";
import { useToday } from "~/stores/useToday";
import { $skyPickedOn, applyForecastWeather, chooseWeather, loadForecast } from "~/stores/forecast";
import SkyPicker from "~/components/shared/SkyPicker";
import ForecastNote from "~/components/shared/ForecastNote";

/**
 * Set the sky on Discover (`client:load`): sets the app-wide weather, which re-themes the page
 * through `data-weather` and re-ranks the list in DiscoverExplorer (both read $weather).
 */
export default function SetTheSky() {
  const weather = useHydratedStore($weather, "sunny");
  const today = useToday();
  useEffect(() => bindThemeToWeather(), []);
  // Discover's default sky is today's forecast (spec §11.1): the saved one first, then a fresh one.
  useEffect(() => {
    applyForecastWeather();
    void loadForecast().then(() => applyForecastWeather());
  }, []);
  const pick = (w: Weather) => {
    if (w === $weather.get()) return;
    chooseWeather(w);
    track({ name: "filter_change", props: { filter: "weather", value: w } });
  };
  const useForecast = (w: Weather) => {
    $skyPickedOn.set("");
    $weather.set(w);
    track({ name: "filter_change", props: { filter: "weather", value: "forecast" } });
  };
  return (
    <>
      <SkyPicker value={weather} onChange={pick} />
      {today && <ForecastNote date={today} value={weather} onUse={useForecast} />}
    </>
  );
}
