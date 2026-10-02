import { describe, expect, it } from "vitest";
import { needsFireAlert, parseFireDanger, ratingLabel } from "./alerts";

const feed = `<?xml version="1.0"?><FireDangerMap>
  <District><Name>Greater Hunter</Name><DangerLevelToday>HIGH</DangerLevelToday><DangerLevelTomorrow>MODERATE</DangerLevelTomorrow><FireBanToday>No</FireBanToday><FireBanTomorrow>No</FireBanTomorrow></District>
  <District><Name>Greater Sydney Region</Name><DangerLevelToday>EXTREME</DangerLevelToday><DangerLevelTomorrow>NO RATING</DangerLevelTomorrow><FireBanToday>Yes</FireBanToday><FireBanTomorrow>No</FireBanTomorrow></District>
</FireDangerMap>`;

describe("RFS fire danger (spec §11.2)", () => {
  it("reads the Greater Sydney Region", () => {
    expect(parseFireDanger(feed, undefined, "t")).toEqual({ district: "Greater Sydney Region", today: "EXTREME", tomorrow: "NO RATING", banToday: true, banTomorrow: false, fetchedAt: "t" });
    expect(ratingLabel("NO RATING")).toBe("No rating");
  });
  it("is null when the district or ratings are missing", () => {
    expect(parseFireDanger(feed, "Far West")).toBeNull();
    expect(parseFireDanger("<html>maintenance</html>")).toBeNull();
  });
  it("applies to outdoor activities only", () => {
    expect(needsFireAlert({ weatherFit: { rainy: 0 } })).toBe(true);
    expect(needsFireAlert({ weatherFit: { rainy: 2 } })).toBe(false);
  });
});
