import got from "got";
import { load } from "cheerio";
import { soundcloudHydrationSchema, soundcloudUserSchema } from "./schemas";

export interface SoundcloudProfileResponse {
  user: ReturnType<typeof soundcloudUserSchema.parse> | null;
}

const SOUND_CLOUD_BASE = "https://soundcloud.com";

function extractHydrationPayload(html: string) {
  const $ = load(html);
  const script = $("script").toArray().find((el) => {
    const node = $(el);
    const contents = node.html() || "";
    return contents.includes("window.__sc_hydration");
  });

  if (!script) {
    return null;
  }

  const contents = load(script).root().text();
  const match = contents.match(/window.__sc_hydration\s*=\s*(\[[\s\S]*\]);?/);
  if (!match) {
    return null;
  }

  try {
    const raw = JSON.parse(match[1]);
    return soundcloudHydrationSchema.parse(raw);
  } catch (error) {
    console.error("Failed to parse SoundCloud hydration", error);
    return null;
  }
}

export async function fetchSoundcloudProfile(permalink: string): Promise<SoundcloudProfileResponse> {
  const targetUrl = permalink.startsWith("http") ? permalink : `${SOUND_CLOUD_BASE}/${permalink}`;

  const html = await got(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  }).text();

  const payload = extractHydrationPayload(html);
  if (!payload) {
    return { user: null };
  }

  const userRecord = payload.find((item) => item.hydratable === "user");
  if (!userRecord) {
    return { user: null };
  }

  const user = soundcloudUserSchema.safeParse(userRecord.data);
  if (!user.success) {
    console.error("SoundCloud user schema validation failed", user.error);
    return { user: null };
  }

  return { user: user.data };
}
