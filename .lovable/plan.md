## Goal

Eliminate raw-key flashes and missing-translation bugs by replacing the async `react-i18next` setup with a synchronous, in-memory strings module that ships every key in both `fr` and `en`.

## Steps

### 1. Audit existing `t()` usage
- Run `rg "t\(['\"]" src` to extract every translation key currently used across `.ts`/`.tsx`.
- Cross-check against the keys listed in the provided `strings.ts` payload. Any key found in code but missing from the payload gets added to both `fr` and `en` before we swap imports (so nothing regresses to a raw key). Expected hotspots: `app-shell.tsx`, `login.tsx`, `signup.tsx`, `_authenticated/index.tsx`, `_authenticated/transactions.tsx`, `paywall-modal.tsx`.

### 2. Create `src/lib/strings.ts`
- Use the exact content provided in the request (translations object, `getNestedValue`, `useTranslation` hook returning `{ t, strings, lang, setLanguage }`).
- Merge any extra keys discovered in step 1 into both `fr` and `en` trees.

### 3. Swap imports everywhere
- Replace `import { useTranslation } from 'react-i18next'` with `import { useTranslation } from '@/lib/strings'` in every component (call signatures stay identical).
- Remove any `import '@/lib/i18n'` (notably from `src/main.tsx` / route root).
- Keep all existing `t('...')` call sites unchanged.

### 4. Remove the old i18n stack
- Delete `src/lib/i18n.ts`, `src/locales/fr.json`, `src/locales/en.json`.
- `bun remove react-i18next i18next i18next-browser-languagedetector` (whichever are installed).
- Remove any `I18nextProvider` / `Suspense` wrapping added for i18n.

### 5. Language switcher
- Add a small FR/EN toggle button using `setLanguage(lang === 'fr' ? 'en' : 'fr')`. Placement: top-right of the desktop sidebar header in `app-shell.tsx`, and inside the mobile bottom-nav header area (or as a small chip near the page title) so it's reachable on both layouts.
- The hook reloads the page on switch so all components re-render with the new locale.

### 6. Verification
- Build runs clean (no stale `react-i18next` imports).
- Manually load `/login`, `/`, `/transactions` in the preview and confirm no raw keys appear.
- Toggle to EN and back to confirm persistence via `localStorage`.

## Going-forward rule
Any new `t('foo.bar')` must be added to both `fr` and `en` branches of `translations` in `src/lib/strings.ts` in the same edit — no exceptions. `getNestedValue` falls back to returning the key path, which is what causes the raw-key symptom if violated.
