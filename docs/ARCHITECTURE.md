# SoundGround Architecture Documentation

Comprehensive overview of the SoundGround application architecture, design decisions, and implementation patterns.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Application Structure](#application-structure)
- [Data Flow](#data-flow)
- [Key Components](#key-components)
- [Caching Strategy](#caching-strategy)
- [Authentication Flow](#authentication-flow)
- [Audio Playback](#audio-playback)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)

---

## Overview

SoundGround is a Next.js 15 application that provides an enhanced interface for discovering and exploring SoundCloud music. The application is built with modern React patterns, TypeScript, and server-side rendering.

### Key Features

- **Artist Discovery** - Deep dive into artist profiles with comprehensive stats
- **Audio Playback** - Built-in HLS audio player with queue management
- **Smart Caching** - SQLite-based caching to minimize API calls
- **OAuth Authentication** - Secure SoundCloud authentication
- **Search** - Search for artists, tracks, and playlists
- **External Links** - Automatic detection of buy/download links

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.5.4 | React framework with App Router |
| **React** | 19.1.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Styling |
| **HLS.js** | 1.6.13 | HLS audio streaming |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 15.5.4 | Backend API |
| **better-sqlite3** | 11.8.1 | Cache database |
| **jose** | 6.1.0 | JWT handling |
| **got** | 14.4.9 | HTTP client |
| **zod** | 3.25.76 | Schema validation |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Jest** | 29.7.0 | Test runner |
| **Testing Library** | 16.1.0 | React testing |
| **ts-jest** | 29.2.5 | TypeScript support |

### DevOps

| Technology | Purpose |
|------------|---------|
| **GitHub Actions** | CI/CD pipeline |
| **Fly.io** | Hosting platform |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |

---

## Application Structure

```
soundground/
├── .github/
│   └── workflows/          # CI/CD workflows
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── [handle]/       # Dynamic profile routes
│   │   ├── api/            # API routes
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   ├── cache/      # Cache management
│   │   │   └── soundcloud/ # SoundCloud proxy
│   │   ├── track/          # Track detail pages
│   │   ├── login/          # Login page
│   │   └── page.tsx        # Home page
│   ├── components/         # React components
│   │   └── __tests__/      # Component tests
│   ├── contexts/           # React contexts
│   │   └── player-context.tsx
│   ├── lib/                # Utility libraries
│   │   ├── auth/           # Authentication utilities
│   │   ├── cache/          # Cache service
│   │   └── soundcloud/     # SoundCloud API client
│   ├── types/              # TypeScript types
│   ├── constants/          # Application constants
│   ├── test-utils/         # Testing utilities
│   └── middleware.ts       # Next.js middleware
├── docs/                   # Documentation
├── scripts/                # Build & deploy scripts
└── public/                 # Static assets
```

### Directory Purposes

#### `/src/app`
- **Next.js 15 App Router** structure
- Server and client components co-located
- API routes for backend functionality
- Automatic code splitting and routing

#### `/src/components`
- Reusable React components
- Both server and client components
- Each component is focused on single responsibility

#### `/src/lib`
- Business logic and utilities
- API clients and data fetching
- Cache management
- Authentication helpers

#### `/src/types`
- Centralized TypeScript types
- Shared interfaces across the app
- Type safety for API responses

---

## Data Flow

### Request Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   Middleware    │
│ (Auth Check)    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   API Routes    │
│   (Backend)     │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Cache Layer    │
│   (SQLite)      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ SoundCloud API  │
│   (External)    │
└─────────────────┘
```

### Data Flow Steps

1. **Client Request** - User navigates to a page or interacts with UI
2. **Middleware** - Checks authentication and session validity
3. **Server Component** - Fetches data server-side (SSR)
4. **API Route** - Proxies requests to SoundCloud API
5. **Cache Check** - Checks if data exists in SQLite cache
6. **External API** - Fetches from SoundCloud if not cached
7. **Cache Store** - Stores response for future requests
8. **Response** - Returns data to client

---

## Key Components

### 1. Player Context

**Location:** `/src/contexts/player-context.tsx`

**Purpose:** Global state management for audio playback

**Features:**
- HLS audio streaming support
- Queue management
- Play/pause/skip controls
- Volume control
- Error handling
- Auto-play next track

**Architecture:**
```
PlayerProvider
  ├── HTML5 Audio Element
  ├── HLS.js Instance
  └── Player State
      ├── currentItem
      ├── queue
      ├── history
      └── playback state
```

### 2. Cache Service

**Location:** `/src/lib/cache/service.ts`

**Purpose:** SQLite-based caching layer to minimize API calls

**Features:**
- TTL-based expiration
- Type-based categorization
- Hit/miss statistics
- Automatic cleanup

**Schema:**
```sql
CREATE TABLE cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE cache_stats (
  type TEXT PRIMARY KEY,
  hit_count INTEGER DEFAULT 0,
  miss_count INTEGER DEFAULT 0,
  last_accessed INTEGER
);
```

### 3. SoundCloud Client

**Location:** `/src/lib/soundcloud/client.ts`

**Purpose:** Type-safe SoundCloud API wrapper

**Features:**
- OAuth token management
- Automatic retry logic
- Type-safe responses
- Error handling

**Clients:**
- `client.ts` - Base API client
- `cached-client.ts` - Cached wrapper
- `smart-client.ts` - Server-side client selector

### 4. Authentication

**Location:** `/src/lib/auth/`

**Purpose:** OAuth 2.0 authentication with SoundCloud

**Flow:**
```
Login Button
  └─> /api/auth/login
      └─> SoundCloud OAuth
          └─> /api/auth/callback
              └─> Set Session Cookie
                  └─> Redirect Home
```

---

## Caching Strategy

### Cache Layers

1. **Browser Cache**
   - Next.js automatic static optimization
   - Image optimization
   - Font caching

2. **Server Cache (SQLite)**
   - API response caching
   - Type-based TTLs
   - Automatic expiration

3. **SoundCloud CDN**
   - Audio streams
   - Images
   - Static assets

### TTL Configuration

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Profile | 30 min | User data changes infrequently |
| Tracks | 15 min | New uploads are less common |
| Playlists | 15 min | Playlist updates are moderate |
| Search | 10 min | Search results change frequently |
| Followers | 60 min | Follower lists are relatively stable |

### Cache Invalidation

- **Automatic:** TTL-based expiration
- **Manual:** Clear cache via `/api/cache` endpoint
- **On-demand:** Bypass cache with query params

---

## Authentication Flow

### OAuth 2.0 with PKCE

```
┌────────┐                              ┌────────────┐
│ Client │                              │ SoundCloud │
└───┬────┘                              └─────┬──────┘
    │                                         │
    │ 1. Click "Login"                        │
    ├────────────────────────────────────────►│
    │                                         │
    │ 2. Generate PKCE challenge              │
    │    (code_verifier + code_challenge)     │
    │                                         │
    │ 3. Redirect to /authorize               │
    ├────────────────────────────────────────►│
    │                                         │
    │ 4. User authorizes                      │
    │                                         │
    │ 5. Redirect to /callback?code=xxx       │
    │◄────────────────────────────────────────┤
    │                                         │
    │ 6. Exchange code for tokens             │
    ├────────────────────────────────────────►│
    │    (with code_verifier)                 │
    │                                         │
    │ 7. Return access_token                  │
    │◄────────────────────────────────────────┤
    │                                         │
    │ 8. Store in JWT session cookie          │
    │                                         │
    │ 9. Redirect to home page                │
    │                                         │
```

### Session Management

- **Storage:** HTTP-only cookies
- **Format:** JWT (HS256)
- **Expiry:** 7 days
- **Refresh:** Automatic token refresh

---

## Audio Playback

### HLS Streaming

SoundGround supports HLS (HTTP Live Streaming) for audio playback:

**Detection:**
```typescript
const isHLS = streamUrl.includes('.m3u8') || format?.protocol === 'hls';
```

**Playback:**
- **Modern browsers:** HLS.js
- **Safari:** Native HLS support
- **Fallback:** Direct MP3 streaming

### Player Architecture

```
┌──────────────────────┐
│   PlayerProvider     │
│  (Global Context)    │
└──────────┬───────────┘
           │
           ├──► HTML5 Audio Element
           ├──► HLS.js Instance
           └──► Player State
                 │
                 ├──► FloatingPlayer (UI)
                 ├──► CustomAudioPlayer (UI)
                 └──► Track Components (Controls)
```

### Queue Management

- **Automatic next:** Play next in queue when track ends
- **Shuffle:** Fisher-Yates shuffle algorithm
- **History:** Track previously played items
- **Error handling:** Skip unplayable tracks automatically

---

## Deployment

### Fly.io Configuration

**File:** `fly.toml`

```toml
app = "soundground"
primary_region = "iad"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  
  [[services.ports]]
    handlers = ["http"]
    port = 80
  
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### Environment Variables

**Required:**
- `SOUNDCLOUD_CLIENT_ID`
- `SOUNDCLOUD_CLIENT_SECRET`
- `SOUNDCLOUD_REDIRECT_URI`
- `JWT_SECRET`

**Optional:**
- `NODE_ENV`
- `FLY_APP_NAME`

### CI/CD Pipeline

**GitHub Actions workflows:**

1. **CI (`.github/workflows/ci.yml`)**
   - Runs on: Push to main, PRs
   - Steps: Lint, type-check, test, build

2. **Deploy (`.github/workflows/deploy.yml`)**
   - Runs on: Push to main
   - Steps: Deploy to Fly.io, health check

3. **PR Checks (`.github/workflows/pr-checks.yml`)**
   - Runs on: Pull requests
   - Steps: Bundle size, security audit, code quality

---

## Design Decisions

### Why Next.js 15?

- **App Router:** Modern routing with RSC support
- **Server Components:** Reduce client bundle size
- **API Routes:** Full-stack in one framework
- **Performance:** Automatic optimization
- **SEO:** Server-side rendering

### Why SQLite for Caching?

- **Simplicity:** No external dependencies
- **Performance:** Fast local database
- **Persistence:** Survives server restarts
- **Zero config:** Works out of the box
- **Cost:** No additional services needed

### Why Context for Player State?

- **Global state:** Audio player needs app-wide state
- **No external deps:** Avoid Redux/Zustand
- **React native:** Uses built-in Context API
- **Performance:** Minimal re-renders

### Why Proxy SoundCloud API?

- **Security:** Hide API credentials
- **Caching:** Add caching layer
- **Rate limiting:** Manage API quotas
- **Transformation:** Normalize responses
- **Error handling:** Centralized error logic

### Why TypeScript?

- **Type safety:** Catch errors at compile time
- **Developer experience:** Better autocomplete
- **Documentation:** Types as documentation
- **Refactoring:** Safe refactoring
- **Maintainability:** Easier to understand code

---

## Performance Optimization

### Server-Side

- **Caching:** Aggressive SQLite caching
- **Parallel requests:** Promise.all for multiple API calls
- **Connection pooling:** Reuse database connections
- **Compression:** gzip/brotli for responses

### Client-Side

- **Code splitting:** Automatic via Next.js
- **Image optimization:** Next.js Image component
- **Lazy loading:** React.lazy for heavy components
- **Memoization:** useMemo/useCallback for expensive operations

### Network

- **CDN:** Fly.io edge caching
- **HTTP/2:** Multiplexing support
- **Asset optimization:** Minification, tree-shaking

---

## Security Considerations

### Authentication

- **HTTP-only cookies:** Prevent XSS attacks
- **PKCE flow:** Secure OAuth without client secret
- **JWT signing:** HS256 with strong secret
- **CSRF protection:** State parameter validation

### API Security

- **Middleware:** Authentication check on all routes
- **Rate limiting:** Via SoundCloud API quotas
- **Input validation:** Zod schemas for user input
- **Error handling:** No sensitive data in errors

### Data Privacy

- **No tracking:** No analytics or tracking
- **Minimal storage:** Only cache SoundCloud public data
- **Session expiry:** 7-day maximum
- **Secure cookies:** HTTPS-only in production

---

## Monitoring & Debugging

### Logging

- **Structured logging:** Custom logger utility
- **Log levels:** DEBUG, INFO, WARN, ERROR
- **Context:** Metadata for debugging
- **Environment-aware:** Verbose in dev, JSON in prod

### Error Tracking

- **Error boundaries:** React error boundaries
- **API errors:** Centralized error handling
- **User feedback:** Clear error messages
- **Fallbacks:** Graceful degradation

---

## Future Improvements

### Planned Features

- [ ] Offline mode with IndexedDB
- [ ] Collaborative playlists
- [ ] Social features (comments, likes)
- [ ] Advanced search filters
- [ ] Playlist generation
- [ ] Audio visualizer
- [ ] Dark mode toggle

### Technical Debt

- [ ] Migrate remaining console.log to logger
- [ ] Increase test coverage to 80%+
- [ ] Add E2E tests with Playwright
- [ ] Implement proper error boundaries
- [ ] Add Storybook for component documentation

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:
- Code style
- Testing requirements
- Pull request process
- Development workflow

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [SoundCloud API Documentation](https://developers.soundcloud.com/)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [Fly.io Documentation](https://fly.io/docs/)

