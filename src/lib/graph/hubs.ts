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
    "\\bcurat(ion|or|orship)",
    "curated .{0,30}(radio|show|platform|selection|channel|series|playlist)",
    "curated by",
    "\\b(mix|premiere|mixtape|radio) series\\b",
    "series (focused|dedicated|where)",
    "(music|electronic|independent|house|techno|disco|bass|dance) ?(music )?label",
    "label by\\b",
    "music company",
    "record shop",
    "no demos\\b",
    "demos? (→|to:|via|through)",
    "weekly podcast",
    "podcast (since|and)\\b",
    "is run by @",
    "online publication",
    "publication (offering|dedicated)",
    "magazine (en ligne|based)",
    "submit (a|your|us)\\b",
    "delivery service",
    "(music|techno) movement",
    "series of events",
    "collective label",
    "(\\b|/)demos? .{0,15}@",
    "platform to (share|discover)",
    "emerging talents?",
    "premieres?, (demos|mixes)",
    "label,? (vinyl|cassette)",
    "independent radio",
    "division of",
    "is now an archive",
    "archive showcasing",
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
const HUB_NAME_RE = /^[^[\]/|·]*\b(records|recordings|recs|tapes|editions|imprint|musik|discos|label|collective|soundsystem|agency|magazine|radio|fm|distribution|podcast|sessions|festival|premieres)\s*$/i;

/** Permalink endings that are label/institution names ("angelsrecs"). */
const HUB_PERMALINK_RE = /(records|recordings|recs|label|tapes|podcast|radio|radioshow|magazine|collective|festival|soundsystem|distribution|premieres|events|series|media)$/i;

export interface HubCandidate {
  urn: string;
  permalink: string | null;
  trackCount: number | null;
}

export interface HubProfileText {
  username?: string;
  description?: string;
  /** Cached upload titles — the shape signal (see isHubByTrackTitles). */
  trackTitles?: readonly string[];
}

export function isHubProfileText(profile: HubProfileText): boolean {
  // NFKC folds stylized Unicode ("𝗠𝗜𝗫 𝗦𝗘𝗥𝗜𝗘𝗦", "𝕃𝕒𝕓𝕖𝕝") to plain letters.
  const description = profile.description?.normalize("NFKC");
  const username = profile.username?.normalize("NFKC").trim();
  if (description && HUB_DESCRIPTION_RE.test(description)) return true;
  if (username && HUB_NAME_RE.test(username)) return true;
  return Boolean(profile.trackTitles && isHubByTrackTitles(profile.trackTitles));
}

/**
 * Title-shape signal: labels/premiere channels upload "Artist – Title"
 * with MANY different artist prefixes; a musician's uploads either lack
 * the dash or repeat their own few aliases. Verified separation on the
 * Berlin crawl: channels run 30–50 distinct prefixes per 50 uploads,
 * artists 1–10. High bar on purpose — canon `artists` overrides misfires.
 */
export function isHubByTrackTitles(titles: readonly string[]): boolean {
  const prefixes = new Set<string>();
  let dashed = 0;
  for (const title of titles) {
    const match = title.match(/^(.{2,40}?)\s+[-–—]\s+/);
    if (match) {
      dashed += 1;
      prefixes.add(match[1].toLowerCase().trim());
    }
  }
  return dashed >= 10 && prefixes.size >= 15 && prefixes.size / dashed >= 0.7;
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
  if (permalink && HUB_PERMALINK_RE.test(permalink)) return true;
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
