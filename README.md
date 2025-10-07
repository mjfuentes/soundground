# CloudMate

A beautiful, modern web application for viewing SoundCloud artist profiles with enhanced features.

## Features

- **Clean Artist Profiles**: View SoundCloud artist profiles with a modern, intuitive interface
- **Enhanced Follower Display**: See top followers sorted by follower count with interactive hover cards
- **Rich Content Display**: 
  - Spotlight tracks with visual embeds
  - Playlists and albums in a grid layout with artwork
  - Expandable descriptions with clickable links and mentions
- **Direct Navigation**: Access any artist profile directly via `/<artist-handle>`

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS**
- **SoundCloud API** (proxied through backend)

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

## Development Workflow

The project uses Husky for pre-commit validation and Cursor Agent Hooks for automated deployment (see `.cursorrules` for configuration).

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
- `npm run validate:env` - Validate environment variables
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

## License

MIT
