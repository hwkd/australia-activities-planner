import { describe, expect, it } from "vitest";
import { eventFields } from "./analytics";
import { DURATIONS, GROUPS } from "./discoverQuery";
import { WEATHERS } from "~/stores/weather";

describe("analytics events (spec §7, D7)", () => {
  it("stores the name, then the properties in the schema's order", () => {
    expect(eventFields({ name: "plan_add", props: { dayType: "weekend", source: "card" } })).toEqual(["plan_add", "card", "weekend"]);
    expect(eventFields({ name: "filter_change", props: { filter: "weather", value: "rainy" } })).toEqual(["filter_change", "weather", "rainy"]);
    expect(eventFields({ name: "activity_view", props: { id: "three-sisters" } })).toEqual(["activity_view", "three-sisters"]);
    expect(eventFields({ name: "activity_view", props: { id: "x".repeat(60) } }), "slugify allows 60").not.toBeNull();
    expect(eventFields({ name: "plan_b_swap", props: {} })).toEqual(["plan_b_swap"]);
    expect(eventFields({ name: "plan_b_swap" })).toEqual(["plan_b_swap"]);
  });

  it("refuses anything that isn't exactly one of the app's events", () => {
    for (const bad of [
      null,
      "plan_add",
      { name: "page_view", props: {} },
      { name: "toString", props: {} },
      { name: "plan_share", props: { scope: "week" } },
      { name: "plan_share", props: {} },
      { name: "plan_share", props: { scope: "day", email: "a@b.c" } },
      { name: "plan_share", props: { scope: 1 } },
      { name: "plan_share", props: ["day"] },
      { name: "activity_view", props: { id: "Three Sisters" } },
      { name: "activity_view", props: { id: "x".repeat(61) } },
    ])
      expect(eventFields(bad), JSON.stringify(bad)).toBeNull();
  });

  it("accepts every filter change the app can send (FilterBar, Set the sky, weather tiles, reset)", () => {
    const sent = [
      ...WEATHERS.map((value) => ({ filter: "weather", value })),
      ...GROUPS.map((g) => ({ filter: "group", value: g.key })),
      ...DURATIONS.map((d) => ({ filter: "duration", value: d.key })),
      ...["free", "pram", "stepFree"].flatMap((filter) => ["true", "false"].map((value) => ({ filter, value }))),
      { filter: "reset", value: "all" },
    ];
    for (const props of sent) expect(eventFields({ name: "filter_change", props }), JSON.stringify(props)).not.toBeNull();
    expect(eventFields({ name: "filter_change", props: { filter: "colour", value: "red" } })).toBeNull();
  });

  it("accepts the state switch's events (D16, M26.4), with a real state only", () => {
    expect(eventFields({ name: "state_picker_open", props: {} })).toEqual(["state_picker_open"]);
    for (const state of ["vic", "qld", "wa", "sa", "tas", "act", "nt"])
      expect(eventFields({ name: "state_interest", props: { state } })).toEqual(["state_interest", state]);
    expect(eventFields({ name: "state_interest", props: { state: "nz" } })).toBeNull();
    expect(eventFields({ name: "state_interest", props: { state: "nsw" } }), "the live state isn't interest").toBeNull();
    expect(eventFields({ name: "state_interest", props: {} })).toBeNull();
  });
});
