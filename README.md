# CloudMate

A beautiful, modern web application for viewing SoundCloud artist profiles with enhanced features.

## Features

- **Clean Artist Profiles**: View SoundCloud artist profiles with a modern, intuitive interface
- **Streaming & Engagement Metrics**: Comprehensive statistics for every profile
  - Track-level metrics: plays, likes, reposts, comments
  - Album/playlist metrics: plays, likes, reposts
  - Profile-wide aggregate statistics
  - Most popular track highlighting
- **Enhanced Follower Display**: See top followers sorted by follower count with interactive hover cards
- **Rich Content Display**: 
  - Spotlight tracks with visual embeds
  - Recent tracks with full engagement metrics
  - Playlists and albums in a grid layout with artwork
  - Expandable descriptions with clickable links and mentions
- **Direct Navigation**: Access any artist profile directly via `/<artist-handle>`
- **Smart Caching**: SQLite-based caching system for improved performance
  - Automatic caching of all SoundCloud API responses
  - Configurable TTL per resource type
  - Cache statistics and management API

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS**
- **SoundCloud API** (proxied through backend)
- **better-sqlite3** for caching
- **Jest** and Testing Library for testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone git@github.com:mjfuentes/cloudmate.git
cd cloudmate
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your SoundCloud client ID:
```bash
SOUNDCLOUD_CLIENT_ID=your_client_id_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

Simply enter a SoundCloud artist handle on the homepage, or navigate directly to `/<artist-handle>` to view their profile.

Example: `/madeon` or `/prosekkopapi`

## API Routes

The app includes backend API routes to proxy SoundCloud requests:

- `/api/soundcloud/profile` - Get artist profile with aggregated data
- `/api/soundcloud/followers` - Paginated follower fetching
- `/api/soundcloud/resolve` - Resolve SoundCloud URLs
- `/api/soundcloud/spotlight` - Get spotlight tracks
- `/api/soundcloud/playlists` - Get artist playlists
- `/api/soundcloud/albums` - Get artist albums
- `/api/cache` - Cache management and statistics

### Cache Management

View cache statistics:
```bash
curl https://cloudmate.fly.dev/api/cache?action=stats
```

Clear all cache:
```bash
curl -X DELETE https://cloudmate.fly.dev/api/cache
```

Delete cache by type:
```bash
curl -X DELETE "https://cloudmate.fly.dev/api/cache?type=soundcloud:profile"
```

## Caching System

CloudMate uses a SQLite-based caching system to improve performance and reduce API calls to SoundCloud:

- **Cache Location**: `./data/cache.db` (automatically created)
- **Cache TTLs**:
  - Profiles: 10 minutes
  - Spotlight tracks: 15 minutes
  - Playlists/Albums: 20 minutes
  - Followers: 30 minutes
- **Features**:
  - Automatic expiration
  - Type-based categorization
  - Hit/miss statistics
  - Manual cache invalidation via API

Configure cache location with environment variable:
```bash
CACHE_DB_PATH=/path/to/cache.db npm run dev
```

## Development Workflow

The project uses Husky for pre-commit validation and Cursor Agent Hooks for automated deployment (see `.cursorrules` for configuration).

### Cursor Slash Commands

Custom slash commands are available in the Cursor Agent to streamline development:

#### `/push` - Complete Deployment Pipeline

Runs the full deployment pipeline: test → commit → push → deploy → verify

This command executes:
1. **Tests** - Run full test suite with coverage
2. **Pre-deployment checks** - TypeScript, ESLint, and build verification
3. **Git staging** - Stage all changes
4. **Commit** - Create commit with descriptive message
5. **Push** - Push to remote repository
6. **Deploy** - Deploy to Fly.io
7. **Verify** - Validate deployment health

To use: Type `/push` in the Cursor Agent input and select it from the dropdown.

### Automated Deployment Pipeline

When the Cursor agent completes a task, it automatically runs:
1. **Pre-deployment checks** - TypeScript, ESLint, build verification, Fly.io checks
2. **UI Validation** - Chrome DevTools checks to verify interface integrity
3. **Git staging** - Stage all changes
4. **Commit** - Create commit with AI-generated message
5. **Deploy** - Deploy to Fly.io
6. **Post-deployment validation** - Health check the deployment

The UI validation step uses Chrome DevTools to:
- Verify the homepage loads correctly
- Test profile pages render without errors
- Check for JavaScript console errors
- Validate key UI components are present

## Deployment

Currently deployed at: https://cloudmate.fly.dev

```bash
npm run deploy
```

Environment secrets are managed via Fly.io:
```bash
flyctl secrets set SOUNDCLOUD_CLIENT_ID=your_id -a cloudmate
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type check
- `npm test` - Run all tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ci` - Run tests in CI mode
- `npm run validate:env` - Validate environment variables
- `npm run validate:ui` - Validate UI with Chrome DevTools
- `npm run validate:deployment` - Validate deployment is running correctly
- `npm run deploy:check` - Run pre-deployment checks
- `npm run deploy:fly` - Deploy to Fly.io
- `npm run deploy` - Full deployment workflow

### Deployment Validation

Validate that your deployment is running correctly:

```bash
# Validate default URL (https://cloudmate.fly.dev/)
npm run validate:deployment

# Validate custom URL
node scripts/validate-deployment.js https://your-app.fly.dev/

# Or use environment variable
DEPLOYMENT_URL=https://your-app.fly.dev/ npm run validate:deployment
```

The validation script checks:
- HTTP response status (200 OK)
- Content validation (HTML structure, page title)
- Response headers (Content-Type)
- Response time performance

**Fly.io-specific checks** (when deploying to Fly.io):
- Machine status (running/stopped machines count)
- Application logs (scans for critical errors like permission issues)
- Volume health (persistent volume attachment status)
- Trial account detection (warns if payment method needed)

## Documentation

- [Caching Implementation](./CACHING_IMPLEMENTATION.md) - Detailed documentation about the SQLite caching system
- [Streaming Metrics](./STREAMING_METRICS.md) - Complete guide to streaming and engagement metrics

## License

MIT
