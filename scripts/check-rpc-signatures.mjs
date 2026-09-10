#!/usr/bin/env node
/**
 * Checks every `supabase.rpc(...)` call against the function signatures in
 * supabase/migrations/*.sql.
 *
 * WHY THIS EXISTS
 *
 * `count_notes` takes three parameters. Two call sites sent four, because they
 * reused the argument object built for `search_notes`, which legitimately takes
 * a fourth. PostgREST resolves overloads by the EXACT set of named arguments,
 * so a superset does not match and it answers:
 *
 *     Could not find the function public.count_notes(...) in the schema cache
 *
 * That reached production. It survived a full Playwright suite because the
 * suite intercepted /rest/v1/rpc/** and implemented the functions in
 * JavaScript, reading whatever fields it liked off the request body — the
 * client was only ever tested against a permissive mock, never against the real
 * contract. Types did not help either: `.rpc()` takes a plain object.
 *
 * So this reads both sides of the contract from source and compares them. No
 * database, no network, runs in milliseconds.
 *
 * WHAT IT CANNOT DO
 *
 * It resolves object literals, identifiers bound to an object literal in the
 * same file, and calls to a local function that returns one — which is every
 * shape in this codebase. Anything else is reported as UNRESOLVED and fails the
 * run, deliberately: a checker that silently skips what it cannot read is worse
 * than no checker.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const SCAN_DIRS = ['app', 'lib', 'components'];

/* ------------------------------------------------------------------ *
 * Side 1: the SQL
 * ------------------------------------------------------------------ */

/**
 * Pulls `create [or replace] function public.name(params)` out of the SQL.
 * Parameter lists here contain no nested parentheses (types are `text`,
 * `boolean`, `integer`, `text[]`), so matching to the first `)` is sound —
 * and if that ever stops being true the parse fails loudly rather than
 * silently reading half a signature.
 */
function readSqlFunctions() {
    const functions = new Map();
    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'))) {
        const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
        const re =
            /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(([^)]*)\)/gi;
        let m;
        while ((m = re.exec(sql)) !== null) {
            const [, name, rawParams] = m;
            const params = rawParams
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p) => ({
                    name: p.split(/\s+/)[0],
                    optional: /\bdefault\b/i.test(p),
                }));
            functions.set(name, { name, params, file });
        }
    }
    return functions;
}

/* ------------------------------------------------------------------ *
 * Side 2: the TypeScript
 * ------------------------------------------------------------------ */

function walk(node, visit) {
    visit(node);
    ts.forEachChild(node, (child) => walk(child, visit));
}

function sourceFiles() {
    const out = [];
    const seen = new Set();
    const visitDir = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
                visitDir(full);
            } else if (/\.tsx?$/.test(entry.name) && !seen.has(full)) {
                seen.add(full);
                out.push(full);
            }
        }
    };
    for (const dir of SCAN_DIRS) visitDir(join(ROOT, dir));
    return out;
}

/** Collects the property names an expression contributes, following spreads. */
function keysOf(expr, source, depth = 0) {
    if (depth > 4) return { keys: null, reason: 'nesting too deep to resolve' };

    if (ts.isObjectLiteralExpression(expr)) {
        const keys = new Set();
        for (const prop of expr.properties) {
            if (ts.isSpreadAssignment(prop)) {
                const inner = keysOf(prop.expression, source, depth + 1);
                if (!inner.keys) return inner;
                inner.keys.forEach((k) => keys.add(k));
            } else if (prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))) {
                keys.add(prop.name.text);
            } else {
                return { keys: null, reason: 'computed property name' };
            }
        }
        return { keys, reason: null };
    }

    // `rpcArgs` — a const in the same file bound to an object literal.
    if (ts.isIdentifier(expr)) {
        let found = null;
        walk(source, (n) => {
            if (
                ts.isVariableDeclaration(n) &&
                ts.isIdentifier(n.name) &&
                n.name.text === expr.text &&
                n.initializer
            ) {
                found = n.initializer;
            }
        });
        if (!found) return { keys: null, reason: `cannot resolve identifier "${expr.text}"` };
        return keysOf(found, source, depth + 1);
    }

    // `args(q)` — a local function whose body returns an object literal.
    if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
        const fnName = expr.expression.text;
        let returned = null;
        walk(source, (n) => {
            const isTarget =
                (ts.isFunctionDeclaration(n) && n.name?.text === fnName) ||
                (ts.isVariableDeclaration(n) &&
                    ts.isIdentifier(n.name) &&
                    n.name.text === fnName &&
                    n.initializer &&
                    (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)));
            if (!isTarget) return;
            const fn = ts.isFunctionDeclaration(n) ? n : n.initializer;
            if (fn.body && ts.isBlock(fn.body)) {
                for (const stmt of fn.body.statements) {
                    if (ts.isReturnStatement(stmt) && stmt.expression) returned = stmt.expression;
                }
            } else if (fn.body) {
                returned = fn.body;
            }
        });
        if (!returned) return { keys: null, reason: `cannot resolve call to "${fnName}()"` };
        return keysOf(returned, source, depth + 1);
    }

    return { keys: null, reason: `unsupported argument expression (${ts.SyntaxKind[expr.kind]})` };
}

function findRpcCalls() {
    const calls = [];
    for (const file of sourceFiles()) {
        const text = readFileSync(file, 'utf8');
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        walk(source, (node) => {
            if (
                !ts.isCallExpression(node) ||
                !ts.isPropertyAccessExpression(node.expression) ||
                node.expression.name.text !== 'rpc'
            ) {
                return;
            }
            const [nameArg, argsArg] = node.arguments;
            if (!nameArg || !ts.isStringLiteralLike(nameArg)) return;

            const { line } = source.getLineAndCharacterOfPosition(node.getStart());
            const where = `${relative(ROOT, file)}:${line + 1}`;

            if (!argsArg) {
                calls.push({ fn: nameArg.text, keys: new Set(), where });
                return;
            }
            const { keys, reason } = keysOf(argsArg, source);
            calls.push({ fn: nameArg.text, keys, reason, where });
        });
    }
    return calls;
}

/* ------------------------------------------------------------------ *
 * Compare
 * ------------------------------------------------------------------ */

const sqlFunctions = readSqlFunctions();
const calls = findRpcCalls();
const problems = [];

for (const call of calls) {
    const fn = sqlFunctions.get(call.fn);
    if (!fn) {
        problems.push(`${call.where}  rpc('${call.fn}') — no such function in supabase/migrations/`);
        continue;
    }
    if (!call.keys) {
        problems.push(`${call.where}  rpc('${call.fn}') — UNRESOLVED: ${call.reason}`);
        continue;
    }

    const names = new Set(fn.params.map((p) => p.name));
    const extra = [...call.keys].filter((k) => !names.has(k));
    const missing = fn.params.filter((p) => !p.optional && !call.keys.has(p.name)).map((p) => p.name);

    if (extra.length) {
        problems.push(
            `${call.where}  rpc('${call.fn}') sends ${extra.map((e) => `"${e}"`).join(', ')}, ` +
                `which ${fn.file} does not declare.\n` +
                `      PostgREST matches on the exact argument set, so this resolves to nothing:\n` +
                `      "Could not find the function public.${call.fn}(...) in the schema cache".\n` +
                `      declared: (${fn.params.map((p) => p.name).join(', ')})`,
        );
    }
    if (missing.length) {
        problems.push(
            `${call.where}  rpc('${call.fn}') omits required ${missing.map((m) => `"${m}"`).join(', ')}`,
        );
    }
}

console.log(
    `Checked ${calls.length} rpc call site${calls.length === 1 ? '' : 's'} ` +
        `against ${sqlFunctions.size} SQL functions.`,
);

if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n`);
    for (const p of problems) console.error(`  ${p}\n`);
    process.exit(1);
}

for (const call of calls) {
    console.log(`  ok  ${call.fn}(${[...call.keys].sort().join(', ')})  ${call.where}`);
}
console.log('\nAll rpc calls match their SQL signatures.');
