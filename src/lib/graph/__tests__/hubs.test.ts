import { classifyHubs, isHub } from "../hubs";
import type { AccountCanon } from "@/lib/browse/canon";

const canon: AccountCanon = {
  hubPermalinks: new Set(["monkeytownrecords"]),
  hubTermFolds: new Set(),
  artistPermalinks: new Set(["not-actually-a-label"]),
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

describe("isHub — profile text", () => {
  const candidate = { urn: "u:9", permalink: "someone", trackCount: 40 };

  it("classifies label-declaring descriptions", () => {
    expect(
      isHub(candidate, canon, {
        description: "Monkeytown is a record label based in Berlin.",
      }),
    ).toBe(true);
    expect(isHub(candidate, canon, { description: "Demo submissions: link in bio" })).toBe(true);
  });

  it("classifies label-shaped names but not artists crediting labels", () => {
    expect(isHub(candidate, canon, { username: "Deeptakt Records" })).toBe(true);
    expect(isHub(candidate, canon, { username: "Volpe [Transcend Records]" })).toBe(false);
    expect(isHub(candidate, canon, { username: "Cailín / Frequency Recordings" })).toBe(false);
  });

  it("classifies festivals, event brands, magazines, and stations", () => {
    expect(isHub(candidate, canon, { description: "A music festival in Tilburg." })).toBe(true);
    expect(
      isHub(candidate, canon, { description: "Amsterdam based DJs, events company and shop" }),
    ).toBe(true);
    expect(
      isHub(candidate, canon, { description: "an online music, arts and culture magazine" }),
    ).toBe(true);
    expect(
      isHub(candidate, canon, { description: "community radio station based in Berlin" }),
    ).toBe(true);
  });

  it("does not classify artists who play festivals or host shows", () => {
    expect(
      isHub(candidate, canon, {
        description: "Clubs, festivals, theaters — played them all across Europe.",
      }),
    ).toBe(false);
  });

  it("ignores artist bios with booking contacts", () => {
    expect(
      isHub(candidate, canon, {
        username: "DJ Plant Texture",
        description: "Mail: x@y.com Booking & Management: info@z.com",
      }),
    ).toBe(false);
  });

  it("honors the canon artist allowlist over every other signal", () => {
    expect(
      isHub(
        { urn: "u:8", permalink: "not-actually-a-label", trackCount: 5000 },
        canon,
        { username: "Something Records", description: "record label" },
      ),
    ).toBe(false);
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
