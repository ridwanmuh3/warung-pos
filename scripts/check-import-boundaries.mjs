import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

/**
 * Import-boundary guard.
 *
 * The target architecture is a modular monolith: routes compose features,
 * features own a vertical slice, `domain` is pure, and `server` is the only
 * layer that touches infrastructure. This script turns that dependency rule
 * into a build failure instead of a convention in a document.
 *
 * During migration `src/lib`, `src/components`, `src/data`, `src/db`, and the
 * loose root modules are classified as LEGACY: they may import anything, and
 * anything may import them. That keeps the guard useful without forcing a
 * big-bang move. The legacy allowance disappears in the final cleanup phase.
 *
 * Run with `pnpm check:imports`.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')
const SKIP = new Set(['routeTree.gen.ts'])

/** Feature name for `src/features/<name>/...`, otherwise null. */
function featureName(relativePath) {
  const parts = relativePath.split('/')
  return parts[0] === 'features' && parts.length > 2 ? parts[1] : null
}

/** Classify a path relative to `src/` into an architectural layer. */
function layerOf(relativePath) {
  const parts = relativePath.split('/')
  const top = parts[0]

  if (top === 'domain') return { kind: 'domain', name: 'domain' }
  if (top === 'server') return { kind: 'server', name: 'server' }
  if (top === 'shared') return { kind: 'shared', name: 'shared' }
  if (top === 'content') return { kind: 'content', name: 'content' }
  if (top === 'routes') return { kind: 'routes', name: 'routes' }
  if (top === 'features') {
    const feature = featureName(relativePath)
    if (feature) return { kind: 'feature', name: feature }
  }
  // `src/types.ts` is the shared type vocabulary; treat it as shared even
  // before the file moves into `src/shared/`.
  if (relativePath === 'types.ts') return { kind: 'shared', name: 'shared' }
  return { kind: 'legacy', name: 'legacy' }
}

/**
 * Allowed targets per importer layer.
 *
 * `legacy` is deliberately permissive during the migration; the point of the
 * guard is to keep the NEW layers honest. Features may only reach into their
 * own folder, plus the shared lower layers.
 */
const RULES = {
  domain: new Set(['domain', 'shared']),
  shared: new Set(['shared']),
  content: new Set(['content', 'shared']),
  server: new Set(['server', 'domain', 'shared']),
  routes: new Set(['feature', 'domain', 'shared', 'content', 'legacy']),
  feature: new Set(['domain', 'server', 'shared', 'content', 'legacy']),
  legacy: null, // no restriction
}

/** True when `importer` may import `target`. */
function isAllowed(importer, target) {
  if (importer.kind === 'legacy') return true
  // Anything may import the legacy tree while the migration is in progress.
  if (target.kind === 'legacy') return true

  const allowed = RULES[importer.kind]
  if (!allowed) return true

  if (importer.kind === 'feature') {
    // A feature may import its own internals, never another feature's.
    if (target.kind === 'feature') return target.name === importer.name
    return allowed.has(target.kind)
  }

  return allowed.has(target.kind)
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, files)
    } else if (/\.(?:ts|tsx)$/.test(entry) && !SKIP.has(entry)) {
      files.push(full)
    }
  }
  return files
}

/** Resolve an import specifier to a path inside `src/`, or null. */
function resolveSpecifier(fromFile, specifier) {
  let absolute
  if (specifier.startsWith('~/')) {
    absolute = join(srcDir, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    absolute = resolve(dirname(fromFile), specifier)
  } else {
    return null
  }

  // A specifier may point at a directory index or omit the extension; the
  // import graph only needs the logical location, so normalise the suffix.
  absolute = absolute.replace(/[\\/](?:index)?\.(?:ts|tsx)$/, '')
  absolute = absolute.replace(/\.(?:ts|tsx)$/, '')

  const rel = relative(srcDir, absolute)
  if (rel.startsWith('..') || rel === '') return null
  return rel.split(sep).join('/')
}

/** Collect every module specifier from a file. */
function importSpecifiers(source, file) {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const specifiers = []

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      specifiers.push(node.moduleReference.expression.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }

  visit(parsed)
  return specifiers
}

const violations = []

for (const file of walk(srcDir)) {
  const importerRel = relative(srcDir, file).split(sep).join('/')
  const importer = layerOf(importerRel)
  const source = readFileSync(file, 'utf8')

  for (const specifier of importSpecifiers(source, file)) {
    const targetRel = resolveSpecifier(file, specifier)
    if (!targetRel) continue
    const target = layerOf(targetRel)
    if (isAllowed(importer, target)) continue

    violations.push({
      file: `src/${importerRel}`,
      specifier,
      importer: importer.kind === 'feature' ? `feature:${importer.name}` : importer.kind,
      target: target.kind === 'feature' ? `feature:${target.name}` : target.kind,
    })
  }
}

if (violations.length > 0) {
  console.error('Import boundaries violated:\n')
  for (const violation of violations) {
    console.error(
      `  ${violation.file}\n    imports ${violation.specifier} (${violation.importer} -> ${violation.target})`,
    )
  }
  console.error('\nDependency rule:')
  console.error('  routes   -> features, domain, shared, content')
  console.error('  features -> domain, server, shared, content, own folder')
  console.error('  server   -> domain, shared')
  console.error('  domain   -> domain, shared types')
  console.error('  shared   -> shared')
  console.error('  content  -> content, shared')
  console.error('  src/lib is LEGACY during migration: it may import anything.')
  process.exit(1)
}

console.log('Import boundaries OK')
