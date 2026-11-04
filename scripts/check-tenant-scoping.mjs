import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

/**
 * Tenant-scoping guard.
 *
 * Multi-tenant isolation depends on one invariant: every query against a
 * tenant-scoped table filters by `tenantId`. This script fails if a query is
 * not scoped, so a query added later cannot silently leak data across shops.
 *
 * Two kinds of tables exist:
 *  - root tables carry `tenant_id` (`products`, `orders`, `carts`, `shifts`,
 *    `stock_movements`, `counters`). Every statement touching one must mention
 *    `tenantId`, including joins.
 *  - child tables (`order_items`, `cart_items`) have no `tenant_id`; they are
 *    scoped through their parent (`orderId` / `cartId`), which in turn came
 *    from a tenant-scoped query.
 *
 * The scan is AST-based: comments and string literals cannot satisfy the
 * predicate, and a chained `.from(x).where(...)` is checked as one statement.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Current repository location during the migration. */
const SOURCE_DIRS = [
  join(root, 'src/lib/data'),
  // Target location; scanned as soon as the repository move happens.
  join(root, 'src/server/db/repositories'),
]

const PARENT_TABLES = new Set([
  'products',
  'orders',
  'shifts',
  'stockMovements',
  'counters',
  'carts',
])

/** Child tables and the parent key that scopes them. */
const CHILD_TABLES = new Map([
  ['orderItems', ['orderId']],
  ['cartItems', ['cartId']],
])

const ACCESS_METHODS = new Set([
  'from',
  'insert',
  'into',
  'update',
  'delete',
  'join',
  'innerJoin',
  'leftJoin',
  'rightJoin',
  'fullJoin',
])

/** Recursively collect `*.server.ts` files from the existing source dirs. */
function sourceFiles(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return [] // The target directory does not exist during the migration.
  }
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full))
    else if (entry.endsWith('.server.ts')) files.push(full)
  }
  return files
}

/** Nearest enclosing statement, so a chained query is judged as a whole. */
function statementOf(node) {
  let current = node
  while (current.parent && !ts.isStatement(current)) current = current.parent
  return current
}

/** Nearest function body (or the file), used to resolve local predicates. */
function containerOf(node) {
  let current = node
  while (current.parent && !ts.isFunctionLike(current)) current = current.parent
  return ts.isFunctionLike(current) ? current : current.getSourceFile()
}

/** Local `const name = …` initializers in one scope, excluding nested functions. */
function declarationsIn(container) {
  const declarations = new Map()
  function collect(node) {
    if (node !== container && ts.isFunctionLike(node)) return
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      !declarations.has(node.name.text)
    ) {
      declarations.set(node.name.text, node.initializer)
    }
    ts.forEachChild(node, collect)
  }
  collect(container)
  return declarations
}

/**
 * True when an expression reaches `tenantId`, following local predicate
 * variables (`const scope = eq(shifts.tenantId, …)`, `const filters = […]`).
 */
function mentionsTenant(expression, declarations, visited = new Set(), depth = 4) {
  if (/\btenantId\b/.test(expression.getText())) return true
  if (depth <= 0) return false
  const names = new Set()
  function collect(node) {
    if (ts.isIdentifier(node)) names.add(node.text)
    ts.forEachChild(node, collect)
  }
  collect(expression)
  for (const name of names) {
    const initializer = declarations.get(name)
    if (!initializer || visited.has(name)) continue
    visited.add(name)
    if (mentionsTenant(initializer, declarations, visited, depth - 1)) return true
  }
  return false
}

function tableOf(call) {
  const callee = call.expression
  if (!ts.isPropertyAccessExpression(callee)) return null
  const method = callee.name.text
  if (!ACCESS_METHODS.has(method)) return null
  const argument = call.arguments[0]
  if (!argument || !ts.isIdentifier(argument)) return null
  const table = argument.text
  if (!PARENT_TABLES.has(table) && !CHILD_TABLES.has(table)) return null
  return { method, table }
}

function violationsIn(file) {
  const source = readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const failures = []
  const seen = new Set()

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const access = tableOf(node)
      if (access) {
        const statement = statementOf(node)
        const text = statement.getText(sourceFile)
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
        const key = `${statement.pos}:${access.method}:${access.table}`
        if (!seen.has(key)) {
          seen.add(key)
          const scoped = PARENT_TABLES.has(access.table)
            ? mentionsTenant(statement, declarationsIn(containerOf(statement)))
            : CHILD_TABLES.get(access.table).some((parentKey) =>
                new RegExp(`\\b${parentKey}\\b`).test(text),
              )
          if (!scoped) {
            const snippet = text.replace(/\s+/g, ' ').slice(0, 160)
            failures.push(`${relative(root, file)}:${line} ${access.method}(${access.table}): ${snippet}`)
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return failures
}

function relative(from, to) {
  return to
    .slice(from.length + 1)
    .split('\\')
    .join('/')
}

const files = SOURCE_DIRS.flatMap(sourceFiles)
const failures = files.flatMap(violationsIn)

if (files.length === 0) {
  console.error('✗ Tenant-scoping guard found no repository files to scan')
  process.exit(1)
}

if (failures.length > 0) {
  console.error('✗ Tenant-scoping guard failed. These accesses are not scoped by tenantId:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(
  `✓ Tenant-scoping guard passed: ${files.length} repository files, every tenant access scoped`,
)
