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

## CI/CD

### Pre-commit Hooks

The project uses Husky for pre-commit hooks. When you commit, it automatically:
- Runs ESLint and auto-fixes issues
- Runs TypeScript type checking
- Tests the build

### Auto-Deployment

Every push to `main` automatically deploys to Fly.io via GitHub Actions.

**Setup:**
1. Add `FLY_API_TOKEN` to GitHub repository secrets (Settings > Secrets and variables > Actions)
2. Push to main branch

## Deployment

Currently deployed at: **https://cloudmate.fly.dev/**

### Manual Deployment
```bash
flyctl deploy -a cloudmate
```

### Environment Variables
Production secrets are managed via Fly.io:
```bash
flyctl secrets set SOUNDCLOUD_CLIENT_ID=your_id -a cloudmate
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript check

## License

MIT
