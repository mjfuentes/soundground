const getEnv = (key: string) => process.env[key];

export function getServerBaseUrl(): string {
  const explicit = getEnv("NEXT_PUBLIC_SITE_URL")?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = getEnv("VERCEL_URL")?.trim();
  if (vercel) {
    const normalized = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return normalized.replace(/\/$/, "");
  }

  const flyApp = getEnv("FLY_APP_NAME")?.trim();
  if (flyApp) {
    return `https://${flyApp}.fly.dev`;
  }

  const port = getEnv("PORT")?.trim() || "3000";
  return `http://localhost:${port}`;
}

