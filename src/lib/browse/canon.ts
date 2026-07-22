/**
 * Curation canon loader (ideas/0003 Phase 2): the one place human/agent
 * judgment enters the otherwise deterministic aggregation pipeline.
 * `data/canon/cities.json` declares non-places ("Worldwide" is a concept,
 * not geography) and alias merges folding can't discover ("NYC" → "New
 * York"). A missing file yields an empty canon; a malformed one throws —
 * silent curation loss would be worse than a loud failure.
 */

import fs from "fs";
import path from "path";
import { z } from "zod";
import { foldTerm } from "./slug";

const canonFileSchema = z.object({
  $comment: z.string().optional(),
  nonPlaces: z.array(z.string().min(1)).default([]),
  cityAliases: z.record(z.string().min(1), z.string().min(1)).default({}),
});

export interface CityCanon {
  /** Fold keys of declared locations that are not places. */
  nonPlaces: ReadonlySet<string>;
  /** Fold key of a variant → canonical display name ("nyc" → "New York"). */
  aliases: ReadonlyMap<string, string>;
}

export const EMPTY_CITY_CANON: CityCanon = { nonPlaces: new Set(), aliases: new Map() };

export function defaultCityCanonPath(): string {
  return process.env.CITY_CANON_PATH || path.join(process.cwd(), "data", "canon", "cities.json");
}

export function loadCityCanon(filePath: string = defaultCityCanonPath()): CityCanon {
  if (!fs.existsSync(filePath)) return EMPTY_CITY_CANON;

  try {
    const parsed = canonFileSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
    return {
      nonPlaces: new Set(parsed.nonPlaces.map(foldTerm).filter(Boolean)),
      aliases: new Map(
        Object.entries(parsed.cityAliases)
          .map(([variant, canonical]) => [foldTerm(variant), canonical] as const)
          .filter(([variant]) => variant.length > 0),
      ),
    };
  } catch (error) {
    throw new Error(
      `Invalid city canon at ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }
}
