/**
 * Aggregation CLI (ideas/0003 Phase 2): graph.db observations → browse_* tables.
 *
 * Usage:
 *   npm run aggregate
 *   npm run aggregate -- --min-genre-artists 12 --min-city-artists 3
 */

import { parseArgs } from "util";
import { openGraphDatabase } from "@/lib/graph/database";
import { aggregate, DEFAULT_AGGREGATE_CONFIG } from "@/lib/browse/aggregate";
import { loadAccountCanon, loadCityCanon } from "@/lib/browse/canon";

function log(message: string): void {
  process.stdout.write(`[aggregate] ${message}\n`);
}

function main(): void {
  const { values } = parseArgs({
    options: {
      db: { type: "string" },
      "min-genre-artists": { type: "string" },
      "min-city-artists": { type: "string" },
    },
  });

  const config = {
    ...DEFAULT_AGGREGATE_CONFIG,
    ...(values["min-genre-artists"]
      ? { minGenreArtists: Number(values["min-genre-artists"]) }
      : {}),
    ...(values["min-city-artists"] ? { minCityArtists: Number(values["min-city-artists"]) } : {}),
  };

  const canon = loadCityCanon();
  const accountCanon = loadAccountCanon();
  log(
    `canon: ${canon.aliases.size} city aliases · ${canon.nonPlaces.size} non-places · ` +
      `${accountCanon.hubPermalinks.size} hub accounts`,
  );

  const db = openGraphDatabase(values.db);
  try {
    const report = aggregate(db, config, undefined, canon, accountCanon);
    log(
      `${report.genres} genres · ${report.cities} cities · ` +
        `${report.genreMemberships} genre memberships · ${report.cityMemberships} city memberships`,
    );
    if (report.excludedGenreTerms.length > 0) {
      log(
        "excluded non-genres: " +
          report.excludedGenreTerms
            .slice(0, 10)
            .map((t) => `${t.term} (${t.artists}, ${t.reason})`)
            .join(", "),
      );
    }
    if (report.belowThresholdGenreTerms.length > 0) {
      log(
        `below genre threshold (${config.minGenreArtists}): ` +
          report.belowThresholdGenreTerms
            .slice(0, 10)
            .map((t) => `${t.term} (${t.artists})`)
            .join(", "),
      );
    }
    if (report.belowThresholdCities.length > 0) {
      log(
        `below city threshold (${config.minCityArtists}): ` +
          report.belowThresholdCities
            .slice(0, 10)
            .map((c) => `${c.city} (${c.artists})`)
            .join(", "),
      );
    }
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `[aggregate] fatal: ${error instanceof Error ? error.message : error}\n`,
  );
  process.exit(1);
}
