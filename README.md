# Prostheia

Browser-based dental CAD learning and design environment.

## Phase 1 development setup

- Node.js `22.12.0` (`.nvmrc`)
- npm `10.9.0`
- Next.js `16.3.6`, React `19.2.8`, TypeScript `5.9.3`
- Three.js `0.186.1`, React Three Fiber `9.8.1`, Drei `10.7.8`

Install from the committed lockfile and start the development server:

```bash
npm ci
npm run dev
```

Use `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e` for
verification. The `/three-smoke` route contains only a minimal rendering check
for the 3D dependency stack.

Copy `.env.example` to `.env.local` when local Supabase credentials are
available. Keep actual credentials out of version control.
