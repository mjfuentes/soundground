# CloudMate

SoundCloud profile viewer with OAuth authentication, caching, and enhanced metrics.

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS**
- **SoundCloud API** (proxied through backend)
- **better-sqlite3** for caching
- **Jest** and Testing Library for testing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Get SoundCloud API credentials:
   - Contact [SoundCloud Support](https://developers.soundcloud.com/) via chat bot
   - Request API credentials for Client Credentials flow (public access only)
   - You'll receive `client_id` and `client_secret`

3. Configure environment (`.env.local`):
```bash
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret  # Optional but recommended
JWT_SECRET=$(openssl rand -base64 32)
```

4. Run:
```bash
npm run dev
```

**Note**: App works in two modes:
- **With `client_secret`**: Uses OAuth Client Credentials (better rate limits, recommended)
- **Without `client_secret`**: Falls back to public `client_id` only (works but deprecated)

## API Routes

**Auth**: `/api/auth/{login,callback,logout,me}`  
**SoundCloud**: `/api/soundcloud/{profile,followers,resolve,spotlight,playlists,albums,tracks}`  
**Cache**: `/api/cache`

All routes except auth require valid session.

## Caching

SQLite cache at `./data/cache.db`. TTLs: 10-30min. Manage via `/api/cache` endpoint.

## Development

Husky pre-commit hooks + Cursor Agent automation configured (see `.cursorrules`).  
Slash command: `/push` - full deploy pipeline.

## Deployment

**Fly.io**: https://cloudmate.fly.dev

```bash
# Set secrets
flyctl secrets set SOUNDCLOUD_CLIENT_ID=xxx SOUNDCLOUD_CLIENT_SECRET=xxx \
  SOUNDCLOUD_REDIRECT_URI=https://cloudmate.fly.dev/api/auth/callback \
  JWT_SECRET=$(openssl rand -base64 32) -a cloudmate

# Deploy
npm run deploy
```

Update SoundCloud app to include production redirect URI.

## Scripts

- `npm run dev` - Dev server
- `npm run build` - Build
- `npm test` - Tests with coverage
- `npm run deploy` - Full deployment
- `npm run deploy:check` - Pre-deploy validation

## License

MIT
