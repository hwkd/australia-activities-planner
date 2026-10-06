import { useEffect } from "react";
import { useHydratedStore } from "~/stores/useHydratedStore";
import { $weather, bindThemeToWeather, chooseWeather, type Weather } from "~/stores/weather";
import { track } from "~/lib/analytics";
import SkyPicker from "~/components/shared/SkyPicker";

/**
 * Set the sky on Discover (`client:load`): sets the app-wide weather, which re-themes the page
 * through `data-weather` and re-ranks the list in DiscoverExplorer (both read $weather). The visitor
 * sets the sky they're expecting: Discover shows no forecast (spec §3.1, D16), so nothing appears or
 * changes under the picker after the page has loaded.
 */
export default function SetTheSky() {
  const weather = useHydratedStore($weather, "sunny");
  useEffect(() => bindThemeToWeather(), []);
  const pick = (w: Weather) => {
    if (w === $weather.get()) return;
    chooseWeather(w);
    track({ name: "filter_change", props: { filter: "weather", value: w } });
  };
  return <SkyPicker value={weather} onChange={pick} />;
}
