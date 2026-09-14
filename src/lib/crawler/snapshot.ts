/**
 * Snapshot export: graph tables → ndjson.gz per run (the Every Noise
 * insurance policy). ndjson.gz over parquet: zero native deps,
 * trivially convertible later (duckdb reads ndjson directly).
 */

import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import type { GraphRepository } from "@/lib/graph/repository";

const SNAPSHOT_TABLES = ["artists", "edges", "artist_terms", "purchase_links"] as const;

function toNdjsonLines(rows: IterableIterator<unknown>): Generator<string> {
  return (function* () {
    for (const row of rows) {
      yield `${JSON.stringify(row)}\n`;
    }
  })();
}

/** Write one .ndjson.gz per table under data/snapshots/<runId>/; returns the directory. */
export async function writeSnapshot(
  repo: GraphRepository,
  runId: number,
  baseDir: string = path.join(process.cwd(), "data", "snapshots"),
): Promise<string> {
  const dir = path.join(baseDir, `run-${String(runId).padStart(4, "0")}`);
  await mkdir(dir, { recursive: true });

  for (const table of SNAPSHOT_TABLES) {
    const target = path.join(dir, `${table}.ndjson.gz`);
    await pipeline(
      Readable.from(toNdjsonLines(repo.iterateTable(table))),
      createGzip(),
      createWriteStream(target),
    );
  }

  return dir;
}
