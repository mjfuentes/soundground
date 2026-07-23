/**
 * Hub classification (ideas/0004 B4, v2): separate institutional accounts —
 * labels, radios, magazines, promo channels — from artists, so circle
 * rosters show musicians and hubs rank in their own section.
 *
 * Signals, in order of authority:
 * 1. Canon `artists` allowlist — force-artist, wins over everything.
 * 2. Canon `hubs` list — judgment cases mechanics can't see.
 * 3. Mechanical: track_count ≥ HUB_TRACK_THRESHOLD (radios/blogs upload
 *    thousands of episodes; no individual has a four-digit own-catalog).
 * 4. Profile text (cached SoundCloud profiles, no API calls):
 *    - description declares label-ness ("record label based in Berlin",
 *      "demo submissions", "imprint", …)
 *    - the display name IS a label name ("Deeptakt Records") — but only
 *      when the label word ends a clean name; "Volpe [Transcend Records]"
 *      is an artist crediting their label and stays an artist.
 *
 * Repost-out-degree deliberately does NOT classify: prolific reposting is
 * normal artist behavior (verified: real artists reach 150+ targets).
 */

import type { AccountCanon } from "@/lib/browse/canon";

export const HUB_TRACK_THRESHOLD = 1000;

/**
 * Institution-ness declared in a profile description: labels, festivals,
 * event brands, magazines, radio stations, distributors. Precision over
 * recall — phrasing must describe the ACCOUNT ("music festival", "event
 * series"), not an artist's career ("played festivals across Europe").
 */
const HUB_DESCRIPTION_RE = new RegExp(
  [
    "record ?label",
    "net-?label",
    "label (based|from|founded|run)",
    "independent label",
    "\\bimprint\\b",
    "(demo|track) submissions?",
    "submit (your )?demos?",
    "send (us )?(your )?demos?",
    "sello discogr",
    "plattenlabel",
    "record company",
    "va compilations?",
    "(music|techno|electronic|dance|arts?) festival\\b",
    "festival (based|founded|series|for|takes place)",
    "(techno|music) club\\b(?! night)",
    "club (based|located) in",
    "platform (for|dedicated|showcasing)",
    "(music|youtube) channel",
    "premiere (inquiries|submissions?|enquiries)",
    "premieres?, demos",
    "demos and inquiries",
    "\\borgani[sz]ation\\b",
    "is an? .{0,20}radio show",
    "podcast series",
    "event series",
    "events? (company|agency|brand|platform|collective)",
    "party series",
    "club night\\b",
    "concert series",
    "(music|media|streaming) platform",
    "(music|culture|online|arts?) magazine",
    "music blog",
    "webzine",
    "(booking|artist|management) agency",
    "community radio",
    "radio (station|network)",
    "web ?radio",
    "\\bnightclub\\b",
    "record store",
    "vinyl shop",
    "music distribution",
    "distribution specialists?",
  ].join("|"),
  "i",
);

/**
 * A name that IS a label name: ends in a label word with no separator
 * earlier in the name (brackets/slashes mean "artist crediting a label").
 */
const HUB_NAME_RE = /^[^[\]/|·]*\b(records|recordings|recs|tapes|editions|imprint|musik|discos|label|collective|soundsystem|agency|magazine|radio|fm|distribution|podcast|sessions)\s*$/i;

export interface HubCandidate {
  urn: string;
  permalink: string | null;
  trackCount: number | null;
}

export interface HubProfileText {
  username?: string;
  description?: string;
}

export function isHubProfileText(profile: HubProfileText): boolean {
  if (profile.description && HUB_DESCRIPTION_RE.test(profile.description)) return true;
  return Boolean(profile.username && HUB_NAME_RE.test(profile.username.trim()));
}

export function isHub(
  candidate: HubCandidate,
  canon: AccountCanon,
  profile?: HubProfileText | null,
): boolean {
  const permalink = candidate.permalink?.toLowerCase();
  if (permalink && canon.artistPermalinks.has(permalink)) return false;
  if ((candidate.trackCount ?? 0) >= HUB_TRACK_THRESHOLD) return true;
  if (permalink && canon.hubPermalinks.has(permalink)) return true;
  return profile ? isHubProfileText(profile) : false;
}

export function classifyHubs(
  candidates: Iterable<HubCandidate>,
  canon: AccountCanon,
  peekProfile: (urn: string) => HubProfileText | null = () => null,
): Set<string> {
  const hubs = new Set<string>();
  for (const candidate of candidates) {
    if (isHub(candidate, canon, peekProfile(candidate.urn))) hubs.add(candidate.urn);
  }
  return hubs;
}
