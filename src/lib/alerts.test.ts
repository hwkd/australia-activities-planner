import { describe, expect, it } from "vitest";
import { fireDistrict, needsFireAlert, parseFireDanger, ratingLabel } from "./alerts";

const feed = `<?xml version="1.0"?><FireDangerMap>
  <District><Name>Greater Hunter</Name><DangerLevelToday>HIGH</DangerLevelToday><DangerLevelTomorrow>MODERATE</DangerLevelTomorrow><FireBanToday>No</FireBanToday><FireBanTomorrow>No</FireBanTomorrow></District>
  <District><Name>Greater Sydney Region</Name><DangerLevelToday>EXTREME</DangerLevelToday><DangerLevelTomorrow>NO RATING</DangerLevelTomorrow><FireBanToday>Yes</FireBanToday><FireBanTomorrow>No</FireBanTomorrow></District>
</FireDangerMap>`;

describe("RFS fire danger (spec §11.2)", () => {
  it("reads the Greater Sydney Region", () => {
    expect(parseFireDanger(feed, undefined, "t")).toEqual({ district: "Greater Sydney Region", today: "EXTREME", tomorrow: "NO RATING", banToday: true, banTomorrow: false, fetchedAt: "t" });
    expect(ratingLabel("NO RATING")).toBe("No rating");
  });
  it("reads another district, and each activity's district comes from where it is", () => {
    expect(parseFireDanger(feed, "Greater Hunter", "t")).toMatchObject({ district: "Greater Hunter", today: "HIGH", banToday: false });
    expect(fireDistrict({ lat: -32.9269 })).toBe("Greater Hunter"); // Newcastle Museum
    expect(fireDistrict({ lat: -33.5636 })).toBe("Greater Sydney Region"); // Riverboat Postman, Brooklyn
    expect(fireDistrict({ lat: -33.6287 })).toBe("Greater Sydney Region"); // Govetts Leap
    expect(fireDistrict({ lat: -34.083 })).toBe("Greater Sydney Region"); // Royal National Park, Bundeena
    expect(fireDistrict({ lat: -34.2536 })).toBe("Illawarra/Shoalhaven"); // Sea Cliff Bridge
    expect(fireDistrict({ lat: -34.6721 })).toBe("Illawarra/Shoalhaven"); // Kiama Blowhole
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
