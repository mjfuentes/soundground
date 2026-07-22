import { classifyHubs, isHub } from "../hubs";
import type { AccountCanon } from "@/lib/browse/canon";

const canon: AccountCanon = {
  hubPermalinks: new Set(["monkeytownrecords"]),
  hubTermFolds: new Set(),
};

describe("isHub", () => {
  it("classifies four-digit catalogs mechanically (radios, blogs, promo)", () => {
    expect(isHub({ urn: "u:1", permalink: "rinsefm", trackCount: 35689 }, canon)).toBe(true);
  });

  it("classifies canon-listed labels regardless of catalog size", () => {
    expect(isHub({ urn: "u:2", permalink: "MonkeytownRecords", trackCount: 77 }, canon)).toBe(
      true,
    );
  });

  it("leaves artists alone — even prolific ones", () => {
    expect(isHub({ urn: "u:3", permalink: "jasmineinfiniti", trackCount: 151 }, canon)).toBe(false);
    expect(isHub({ urn: "u:4", permalink: null, trackCount: null }, canon)).toBe(false);
  });
});

describe("classifyHubs", () => {
  it("returns the urns of every hub in the pool", () => {
    const hubs = classifyHubs(
      [
        { urn: "u:1", permalink: "rinsefm", trackCount: 35689 },
        { urn: "u:2", permalink: "monkeytownrecords", trackCount: 77 },
        { urn: "u:3", permalink: "someartist", trackCount: 12 },
      ],
      canon,
    );
    expect([...hubs].sort()).toEqual(["u:1", "u:2"]);
  });
});
