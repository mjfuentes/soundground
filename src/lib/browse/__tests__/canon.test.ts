import fs from "fs";
import os from "os";
import path from "path";
import { EMPTY_CITY_CANON, loadCityCanon } from "../canon";

describe("loadCityCanon", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-canon-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (content: unknown): string => {
    const filePath = path.join(dir, "cities.json");
    fs.writeFileSync(filePath, JSON.stringify(content));
    return filePath;
  };

  it("returns an empty canon when the file does not exist", () => {
    expect(loadCityCanon(path.join(dir, "missing.json"))).toBe(EMPTY_CITY_CANON);
  });

  it("fold-keys non-places and alias variants", () => {
    const canon = loadCityCanon(
      write({
        nonPlaces: ["Worldwide", "The Internet"],
        cityAliases: { NYC: "New York", "St. Petersburg": "Saint Petersburg" },
      }),
    );
    expect(canon.nonPlaces.has("worldwide")).toBe(true);
    expect(canon.nonPlaces.has("theinternet")).toBe(true);
    expect(canon.aliases.get("nyc")).toBe("New York");
    expect(canon.aliases.get("stpetersburg")).toBe("Saint Petersburg");
  });

  it("throws loudly on malformed canon", () => {
    expect(() => loadCityCanon(write({ cityAliases: { nyc: 42 } }))).toThrow(/Invalid city canon/);
  });

  it("parses the repo's actual canon file", () => {
    const canon = loadCityCanon();
    expect(canon.aliases.get("nyc")).toBe("New York");
    expect(canon.nonPlaces.has("worldwide")).toBe(true);
  });
});
