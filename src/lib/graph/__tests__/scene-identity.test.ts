import { matchSceneIds } from "../scene-identity";

const previous = (entries: [number, string[]][]): Map<number, Set<string>> =>
  new Map(entries.map(([id, members]) => [id, new Set(members)]));

describe("matchSceneIds", () => {
  it("keeps IDs for clusters that drift slightly", () => {
    const prev = previous([
      [1, ["a", "b", "c", "d"]],
      [2, ["x", "y", "z"]],
    ]);
    const ids = matchSceneIds(prev, [
      ["x", "y", "z", "w"], // scene 2, one newcomer
      ["a", "b", "c", "e"], // scene 1, one swap
    ]);
    expect(ids).toEqual([2, 1]);
  });

  it("assigns fresh IDs beyond the previous maximum to new clusters", () => {
    const prev = previous([[7, ["a", "b", "c"]]]);
    const ids = matchSceneIds(prev, [
      ["a", "b", "c"],
      ["p", "q", "r"],
      ["s", "t", "u"],
    ]);
    expect(ids).toEqual([7, 8, 9]);
  });

  it("gives each previous ID to at most one cluster (best overlap wins)", () => {
    // Scene 1 split in two: the half overlapping it more keeps the ID.
    const prev = previous([[1, ["a", "b", "c", "d", "e"]]]);
    const ids = matchSceneIds(prev, [
      ["a", "b"],
      ["c", "d", "e"],
    ]);
    expect(ids[1]).toBe(1);
    expect(ids[0]).toBe(2);
  });

  it("ignores overlaps below the Jaccard threshold", () => {
    const prev = previous([[1, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]]]);
    const ids = matchSceneIds(prev, [["a", "p", "q", "r", "s", "t", "u", "v", "w", "x"]], {
      minJaccard: 0.5,
    });
    expect(ids).toEqual([2]);
  });

  it("starts at 1 with no previous scenes", () => {
    expect(matchSceneIds(new Map(), [["a"], ["b"]])).toEqual([1, 2]);
  });

  it("is deterministic on ties", () => {
    const prev = previous([[1, ["a", "b"]]]);
    // Both clusters overlap scene 1 equally; the earlier cluster wins.
    const ids = matchSceneIds(prev, [
      ["a", "x"],
      ["b", "y"],
    ]);
    expect(ids).toEqual([1, 2]);
  });
});
