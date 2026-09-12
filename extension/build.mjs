// Bundles the extension into dist/ and stamps the Supabase URL into the
// manifest's host_permissions, so the same values the app uses drive the
// extension. Reads, in order: extension/.env, ../.env.local, ../.env.
import { build, context } from 'esbuild';
import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const watch = process.argv.includes('--watch');

function readEnv(file) {
    if (!existsSync(file)) return {};
    const out = {};
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (!m) continue;
        out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
}

const env = {
    ...readEnv(join(here, '..', '.env')),
    ...readEnv(join(here, '..', '.env.local')),
    ...readEnv(join(here, '.env')),
    ...process.env,
};

const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key || url === 'your-project-url') {
    console.error(
        'Missing Supabase settings.\n' +
            'Set SUPABASE_URL and SUPABASE_ANON_KEY in extension/.env, or\n' +
            'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the app\'s .env.local.',
    );
    process.exit(1);
}

mkdirSync(dist, { recursive: true });
mkdirSync(join(dist, 'icons'), { recursive: true });

const manifest = JSON.parse(readFileSync(join(here, 'manifest.json'), 'utf8'));
manifest.host_permissions = [new URL(url).origin + '/*'];
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

copyFileSync(join(here, 'src', 'popup.html'), join(dist, 'popup.html'));
for (const f of readdirSync(join(here, 'icons'))) {
    copyFileSync(join(here, 'icons', f), join(dist, 'icons', f));
}

const options = {
    entryPoints: [join(here, 'src', 'background.ts'), join(here, 'src', 'popup.ts')],
    outdir: dist,
    bundle: true,
    format: 'esm',
    target: 'chrome120',
    sourcemap: watch ? 'inline' : false,
    minify: !watch,
    define: {
        __SUPABASE_URL__: JSON.stringify(url),
        __SUPABASE_KEY__: JSON.stringify(key),
        // supabase-js reads this; without it the bundle references `process`.
        'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
    },
    logLevel: 'info',
};

if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    console.log('Watching… reload the extension in chrome://extensions after changes.');
} else {
    await build(options);
    console.log(`Built to ${dist}`);
}
