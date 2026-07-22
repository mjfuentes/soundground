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

const accountCanonSchema = z.object({
  $comment: z.string().optional(),
  hubs: z.array(z.string().min(1)).default([]),
  hubTerms: z.array(z.string().min(1)).default([]),
});

export interface AccountCanon {
  /** Permalinks of institutional accounts (labels, radios, mags, promo). */
  hubPermalinks: ReadonlySet<string>;
  /** Fold keys of institution tag-spellings that differ from permalinks. */
  hubTermFolds: ReadonlySet<string>;
}

export const EMPTY_ACCOUNT_CANON: AccountCanon = {
  hubPermalinks: new Set(),
  hubTermFolds: new Set(),
};

export function defaultAccountCanonPath(): string {
  return (
    process.env.ACCOUNT_CANON_PATH || path.join(process.cwd(), "data", "canon", "accounts.json")
  );
}

export function loadAccountCanon(filePath: string = defaultAccountCanonPath()): AccountCanon {
  if (!fs.existsSync(filePath)) return EMPTY_ACCOUNT_CANON;
  try {
    const parsed = accountCanonSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
    return {
      hubPermalinks: new Set(parsed.hubs.map((permalink) => permalink.toLowerCase())),
      hubTermFolds: new Set(parsed.hubTerms.map(foldTerm).filter(Boolean)),
    };
  } catch (error) {
    throw new Error(
      `Invalid account canon at ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }
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
