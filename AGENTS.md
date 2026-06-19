# AGENTS.md

Agent guidance for AeroSend frontend development.

## Commands

```bash
npm run dev        # Dev server → http://localhost:5173
npm run build      # TypeScript check + Vite build
npm run lint       # ESLint check
npm run preview    # Preview production build
```

**Build order matters:** `tsc -b` runs first in the build script, so typecheck errors block the build.

## Backend dependency

- Backend must run at `http://localhost:3000` for local dev
- Production hardcoded to `https://do.velsat.pe:8443/whatsapp` (see `src/App.tsx:26`)
- No env vars for backend URL—change requires code edit

## Architecture

- **Vite + React 19 + TypeScript**, flat src structure (no components/ folder)
- **Socket.IO**: Global socket connection managed in `App.tsx`, used for real-time campaign progress and connection status
- **Authentication**: `api_key` stored in `localStorage` as `wa_user_session`, checked on mount in `App.tsx`
- **Views**: `ConnectionView`, `SendView`, `MasivoSection` (bulk), `CampaignsView`, `ApiView`—all top-level files in `src/`

## Key conventions

- **Naming**: View files use PascalCase with inconsistent suffixes (`Connectionview.tsx` vs `LoginView.tsx`)—follow existing pattern when adding files
- **Toast system**: Managed in `App.tsx`, passed down as `addToast` callback
- **Upload flow**: Files upload via `/api/upload` first, returns `fileUrl` to include in message payload
- **Campaign events**: Real-time via Socket.IO events `campaign:progress`, `campaign:complete`, `campaign:error`

## Testing

No test suite configured. Verify changes manually with `npm run dev`.

## TypeScript config

- Strict mode enabled with extra checks (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`)
- Project uses composite TS config (app + node references)
- Uses `verbatimModuleSyntax` and `allowImportingTsExtensions`—import paths must be explicit

## ESLint

Flat config format. Ignores `dist/`. Enforces React Hooks rules and React Refresh patterns.

## API reference

See `README.md` for full endpoint table. Backend expected at port 3000 locally, all routes under `/api/`.

## Gotchas

- Backend URL is hardcoded—no env var support
- Socket connection lifecycle tied to App mount/unmount and user session
- Campaign polling uses socket events, not REST polling
- File upload returns `fileUrl` string, not a file ID
