import { describe, expect, it } from "vitest";
import { activitySchema } from "~/content/schema";
import { checkActivities } from "./content-checks";
import { newActivity, slugify } from "./activityTemplate";

describe("new activity template", () => {
  it("is valid under the schema and the cross-checks", () => {
    const a = newActivity("test-place", "Test place");
    expect(activitySchema.safeParse(a).success).toBe(true);
    expect(checkActivities([a])).toEqual([]);
  });
  it("starts with one trip from Central, no driving, and one unchecked start place on the map", () => {
    const a = newActivity("test-place", "Test place");
    expect(a.routes.pt.legs).toHaveLength(1);
    expect(a.routes.drive).toBeNull();
    expect(a.routes.unavailable?.drive).toBeTruthy();
    expect(a.geo.places).toEqual([expect.objectContaining({ n: 1, type: "start", name: "Test place" })]);
    expect(a.geo).toMatchObject({ source: "To be added", checked: null });
    expect(a.geo.trail).toBeUndefined();
  });
  it("slugs names into ids", () => {
    expect(slugify("Bondi to Coogee Coastal Walk")).toBe("bondi-to-coogee-coastal-walk");
    expect(slugify("  Haymarket & Chinatown  ")).toBe("haymarket-and-chinatown");
    expect(slugify("Café São Paulo!")).toBe("cafe-sao-paulo");
  });
});
