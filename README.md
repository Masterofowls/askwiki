# reusable-ts

A full-featured, reusable TypeScript template with modern tooling — testing, linting, building, and 7 categories of automation scripts for production-ready TypeScript libraries.

## Features

- **TypeScript** — Strict mode with path aliases (`@/`)
- **Testing** — Jest (unit) + Playwright (e2e) + Testing Library (React)
- **Linting** — Biome (TS/JS/JSON) + Stylelint (CSS)
- **Building** — TypeScript compiler (`tsc`) + Vite
- **Environment** — dotenv + dotenvx (encrypted `.env` management)
- **CI/CD** — GitHub Actions with lint → type-check → test → build pipeline
- **Dependency hygiene** — depcheck (unused deps) + npm-check-updates (updates) + knip (dead code detection)
- **Security** — npm audit + audit-ci (CI-friendly security gates)
- **Compatibility** — Automatic engine, peer dep, and duplicate-check validation
- **Error handling** — Typed error classes + Zod schema wrapper + Result type utilities

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> my-project
cd my-project
npm install

# 2. Rename the package (search-and-replace "reusable-ts" in package.json)
#    Also update the "description", "keywords", and "repository" fields.

# 3. Run the full verification pipeline
npm run verify

# 4. Start developing
npm run dev
```

## Setting Up a New Project

After cloning, customize these files:

| File | What to change |
|---|---|
| `package.json` | `name`, `version` (start at `0.1.0`), `description`, `keywords` |
| `LICENSE` | Update year and copyright holder if needed |
| `.env.example` | Add environment variables your project needs |
| `README.md` | Replace this section with your project's docs |
| `.github/workflows/ci.yml` | Adjust Node versions if needed |

Then delete the example source:

```bash
rm -rf e2e/example.spec.ts src/__tests__/ src/utils/__tests__/math.test.ts src/utils/math.ts
# Or keep them as reference and gradually replace
```

## Scripts

### Core

| Script | Description |
|---|---|
| `npm run build` | Build the library (emit `.js` + `.d.ts` to `dist/`) |
| `npm run dev` | Watch mode build |
| `npm run clean` | Remove `dist/`, `coverage/`, `.cache` |
| `npm run type-check` | TypeScript type checking (no emit) |
| `npm test` | Run unit tests (Jest) |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run test:e2e:ui` | Run Playwright with interactive UI |
| `npm run test:all` | Coverage + e2e tests |

### Linting & Formatting

| Script | Description |
|---|---|
| `npm run lint` | Auto-fix lint issues + format code (Biome) |
| `npm run lint:ci` | Lint check only (CI-safe, no writes) |
| `npm run lint:styles` | Check CSS styles (Stylelint) |
| `npm run lint:styles:fix` | Auto-fix CSS styles |
| `npm run format` | Format all source files (Biome) |

### Dependency Hygiene

| Script | Description |
|---|---|
| `npm run depcheck` | Find unused, missing, or unlisted dependencies |
| `npm run knip` | Dead code detection — finds unused files, exports, and dependencies |
| `npm run ncu` | Check for package updates (interactive) |
| `npm run ncu:update` | Update all packages interactively |
| `npm run ncu:auto` | Auto-update all packages (non-interactive) |

### Compatibility

| Script | Description |
|---|---|
| `npm run check:compat` | Validate the full dependency tree — engines, peer deps, duplicates, outdated packages, tsconfig |

### Security

| Script | Description |
|---|---|
| `npm run security` | `npm audit` with moderate+ severity threshold |
| `npm run security:ci` | `audit-ci` with high+ severity threshold (fail-safe for CI) |

### SEO

| Script | Description |
|---|---|
| `npm run seo` | Run seo-analyzer on built HTML files |

### Environment

| Script | Description |
|---|---|
| `npm run env:pull` | Pull encrypted `.env` from dotenvx |
| `npm run env:push` | Push encrypted `.env` to dotenvx |

### Verification Pipelines

| Script | Description |
|---|---|
| `npm run verify` | **Full CI pipeline**: type-check → lint:ci → knip → test → build → security:ci |
| `npm run verify:all` | **Extended**: verify + check:compat |

## Error Utilities (`src/utils/errors.ts`)

The template includes a set of typed error utilities built on Zod v4. Files in `src/` can import from `@/utils/errors`.

### Typed Error Classes

```typescript
import { AppError, NotFoundError, ValidationError, ConfigurationError } from "@/utils/errors"

// Base error with code, statusCode, and optional details
throw new AppError("Something went wrong", "ERROR_CODE", 500, { context: "..." })

// Pre-defined subclasses
throw new NotFoundError("User")                                        // 404, "User not found"
throw new ValidationError("Invalid email", { field: "email" })         // 400
throw new ConfigurationError("Missing API key")                        // 500
```

All error classes maintain proper prototype chains — `instanceof` checks work through inheritance:

```typescript
const err = new ValidationError("bad")
err instanceof ValidationError  // true
err instanceof AppError         // true
err instanceof Error            // true
```

### Zod Schema Wrapper

```typescript
import { createSchema, z } from "@/utils/errors"

// Define a schema
const UserSchema = createSchema(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
)

// Parse — throws ValidationError with Zod issues on failure
const user = UserSchema.parse(rawData)

// Safe parse — returns Zod result object
const result = UserSchema.safeParse(rawData)
if (!result.success) {
  console.error(result.error.issues)
}

// Access the underlying schema
UserSchema.schema  // z.ZodType<T>
```

### Result Type

```typescript
import { tryCatch, tryCatchAsync } from "@/utils/errors"

// Sync — wraps any throwing function
const result = tryCatch(() => riskyOperation())
if (result.ok) {
  console.log(result.value)  // typed as T
} else {
  console.error(result.error.message)  // typed as AppError
}

// Async — wraps any rejecting function
const asyncResult = await tryCatchAsync(() => fetchData())
if (asyncResult.ok) {
  // use asyncResult.value
}
```

Non-`AppError` exceptions are automatically wrapped into `AppError` with code `"UNKNOWN"`.

## Interpreting Verification Results

### `npm run verify` (recommended before every commit)

```bash
npm run type-check   # Fails → TypeScript errors. Fix type issues first.
npm run lint:ci      # Fails → Lint errors. Run `npm run lint` to auto-fix.
npm run knip         # Warnings are OK. Errors mean unused files/deps.
npm test             # Fails → broken functionality. Check test output.
npm run build        # Fails → build configuration issue.
npm run security:ci  # Fails → High/critical vulns. Run `npm audit` to investigate.
```

### `npm run check:compat`

Run this before major dependency updates or Node version bumps. It validates:

- **Engine requirements** — your Node version satisfies `engines.node`
- **Dependency tree** — no unmet peer dependencies
- **Duplicates** — no unnecessary duplicate packages (`npm dedupe` can clean them)
- **Outdated packages** — packages that need updates
- **tsconfig** — TypeScript config is parseable (including C-style comments)

### Known Expected Warnings

| Tool | Warning | Reason |
|---|---|---|
| `knip` | `InferOutput` / `InferInput` unused | Library type re-exports — not consumed internally, but part of the public API |
| `depcheck` | react-dom, @testing-library/*, @types/*, ts-jest, etc. | Pre-configured optional tooling — not consumed by current source code |
| `security:ci` | Critical vulns in `seo-analyzer` → `request` → `form-data` | Pre-existing transitive vulnerability in a deprecated dependency |
| `security:ci` | May fail on fresh install | If this is a blocker, run `npm audit` to assess actual risk |

## Project Structure

```
reusable-ts/
├── .github/workflows/    — CI pipeline (lint → type-check → lint:ci → knip → test → build → compatibility → security)
├── e2e/                  — Playwright end-to-end tests
├── scripts/              — Node.js automation scripts
│   └── check-compatibility.mjs  — Dependency tree compatibility checker
├── src/                  — Library source code
│   ├── __tests__/        — Public API tests
│   ├── utils/            — Internal modules
│   │   ├── __tests__/    — Unit tests
│   │   ├── errors.ts     — Typed error classes + Zod wrapper + Result type
│   │   └── math.ts       — Example math utilities
│   └── index.ts          — Public entry point
├── .env.example          — Environment template
├── biome.json            — Linting & formatting (Biome)
├── jest.config.mjs       — Test configuration (Jest, ESM format)
├── knip.json             — Dead code detection config
├── package.json
├── playwright.config.ts  — E2E configuration
├── stylelint.config.js   — CSS linting
├── tsconfig.json         — TypeScript strict mode (extends tsconfig.build.json)
├── tsconfig.build.json   — Build-specific config
└── vite.config.ts        — Vite build config
```

## CI Pipeline

The `.github/workflows/ci.yml` runs on push/PR to `main`:

1. **lint** — `biome ci .` + `stylelint`
2. **type-check** — `tsc --noEmit`
3. **test** — `jest --passWithNoTests`
4. **build** — `tsc -p tsconfig.build.json`
5. **code-quality** — `knip` + `depcheck`
6. **compatibility** — `npm run check:compat`
7. **security** — `audit-ci --high`

## License

MIT
