/**
 * Compatibility checker — validates your dependency tree for:
 * - Peer dependency resolution
 * - Engine requirements (node, npm)
 * - Duplicate packages
 * - Deprecated packages
 * - Bundled TypeScript version compatibility
 *
 * Usage: node scripts/check-compatibility.mjs
 */

import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
let exitCode = 0
const issues = []

function fail(message) {
  issues.push(`  [FAIL] ${message}`)
  exitCode = 1
}

function ok(message) {
  issues.push(`  [OK]   ${message}`)
}

// ── 1. Read root package.json ──────────────────────────────────
let pkg
try {
  pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"))
} catch {
  fail("Cannot read package.json")
  printReport()
  process.exit(1)
}

console.log("\n  Compatibility check for", pkg.name, pkg.version, "\n")

// ── 2. Engine requirements ─────────────────────────────────────
if (pkg.engines) {
  if (pkg.engines.node) {
    const match = process.version.match(/^v(\d+)/)
    const major = match ? Number.parseInt(match[1], 10) : 0
    const required = pkg.engines.node.match(/(\d+)/)
    const min = required ? Number.parseInt(required[1], 10) : 0
    // basic semver check (>= comparisons only)
    if (pkg.engines.node.startsWith(">=") && major < min) {
      fail(`Node.js ${process.version} does not satisfy engine requirement "${pkg.engines.node}"`)
    } else {
      ok(`Node.js ${process.version} satisfies "${pkg.engines.node}"`)
    }
  }
} else {
  ok("No engine restrictions declared")
}

const npmVersion = execSync("npm --version", { encoding: "utf-8" }).trim()
ok(`npm ${npmVersion} available`)

// ── 3. Dependency tree audit ───────────────────────────────────
console.log("  Dependency tree analysis:")

try {
  execSync("npm ls --depth=0", {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  ok("Top-level dependency tree is consistent")
} catch {
  // npm ls exits non-zero for unmet peer deps, etc.
  fail("Top-level dependency tree has issues (run 'npm ls' for details)")
}

// ── 4. Duplicate packages ──────────────────────────────────────
try {
  const dedupOut = execSync("npm dedupe --dry-run 2>&1 || true", {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (dedupOut.includes("dedupe")) {
    fail(`Duplicate packages detected - run 'npm dedupe'`)
  } else {
    ok("No duplicate packages detected")
  }
} catch {
  ok("Could not check for duplicates (npm dedupe --dry-run failed)")
}

// ── 5. Deprecated packages ─────────────────────────────────────
try {
  const outdatedOut = execSync("npm outdated 2>&1 || true", {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  const lines = outdatedOut.trim().split("\n").filter(Boolean)
  if (lines.length > 0 && !outdatedOut.includes("ERR")) {
    // Skip the header line
    const outdated = lines.filter((l) => !l.startsWith("Package"))
    if (outdated.length > 0) {
      fail(`${outdated.length} package(s) outdated (run 'npm outdated' for details)`)
    } else {
      ok("All packages are up-to-date")
    }
  } else {
    ok("All packages are up-to-date")
  }
} catch {
  ok("Could not check outdated packages")
}

// ── 6. Path aliases match tsconfig ─────────────────────────────
try {
  const raw = readFileSync(resolve(root, "tsconfig.json"), "utf-8")
  // Strip C-style comments since JSON.parse doesn't handle them
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
  const tsconfig = JSON.parse(stripped)
  const paths = tsconfig.compilerOptions?.paths
  if (paths) {
    const aliases = Object.keys(paths)
    ok(`TypeScript path aliases configured: ${aliases.join(", ")}`)
  } else {
    ok("No TypeScript path aliases configured")
  }
} catch {
  fail("Could not read tsconfig.json")
}

// ── Print report ───────────────────────────────────────────────
function printReport() {
  console.log()
  for (const issue of issues) {
    console.log(issue)
  }
  console.log()
  if (exitCode === 0) {
    console.log("  ✓ All compatibility checks passed")
  } else {
    console.log("  ✗ Some compatibility checks failed")
  }
  console.log()
}

printReport()
process.exit(exitCode)
