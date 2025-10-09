# SoundGround Technical Reference

Quick reference guide for development. For AI agent rules, see `.cursorrules`.

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router (pages & API)
├── components/       # React components + __tests__/
├── contexts/         # React contexts (player)
├── lib/              # Utilities, API clients, auth, cache
├── types/            # Centralized TypeScript types
├── constants/        # Centralized constants
└── test-utils/       # Testing utilities
```

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `/src/types/index.ts` | All TypeScript types |
| `/src/constants/index.ts` | All constants (TTLs, URLs, errors) |
| `/src/lib/logger.ts` | Structured logging utility |
| `/src/test-utils/index.ts` | Test helpers and mock factories |
| `.cursorrules` | AI agent coding standards |

## 🏗️ Architecture Quick Reference

### Data Flow
```
Browser → Middleware (auth) → API Route → Cache → SoundCloud API
```

### Caching
- **Storage:** SQLite (`./data/cache.db`)
- **TTLs:** Profile (30m), Tracks (15m), Search (10m)
- **Access:** `/src/lib/cache/service.ts`

### Authentication
- **Method:** OAuth 2.0 with PKCE
- **Storage:** HTTP-only JWT cookies
- **Expiry:** 7 days

### Audio Player
- **Format:** HLS streaming (with fallback)
- **Library:** HLS.js
- **State:** React Context (`player-context.tsx`)

## 📝 Common Patterns

### Import Shared Types
```typescript
import type { SoundCloudTrack, SoundCloudUser } from '@/types';
```

### Use Constants
```typescript
import { CACHE_TTL, API_ROUTES, ERROR_MESSAGES } from '@/constants';
```

### Use Logger (NOT console.log)
```typescript
import { createLogger } from '@/lib/logger';
const logger = createLogger({ component: 'MyComponent' });
logger.info('Something happened', { data });
logger.error('Failed', { context }, error);
```

### Write Tests
```typescript
import { renderWithProviders, createMockTrack } from '@/test-utils';

describe('MyComponent', () => {
  it('should render', () => {
    const track = createMockTrack();
    renderWithProviders(<MyComponent track={track} />);
  });
});
```

## 🧪 Testing

```bash
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode
npm run test:ci       # CI mode
```

**Coverage Goals:** 70%+ overall, 80%+ new code

## 🚀 Development

```bash
npm run dev           # Start dev server (port 3000)
npm run build         # Production build
npm run type-check    # TypeScript validation
npm run lint:fix      # Auto-fix linting
```

## 📦 Deployment

```bash
npm run deploy        # Full pipeline: validate + deploy
npm run deploy:fly    # Deploy to Fly.io only
```

**Environment:** Fly.io (app: `soundground`, region: `iad`)

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 3000 busy | `lsof -ti:3000 \| xargs kill -9` |
| Type errors | `npm run type-check` |
| Linting errors | `npm run lint:fix` |
| Tests failing | `npm test -- --verbose` |
| Deployment fails | `flyctl logs -n -a soundground` |

## 📚 More Details

- **API Reference:** `docs/API.md` - Complete API endpoint documentation
- **Architecture:** `docs/ARCHITECTURE.md` - Detailed system design
- **Cursor Rules:** `.cursorrules` - AI agent coding standards

---

**For anything not covered here, check the detailed docs above or the code itself.**

