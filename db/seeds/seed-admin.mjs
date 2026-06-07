// Runner do seed de DEV do admin. Usa o pacote `postgres` (já é dependência) —
// não depende de psql instalado. Lê DATABASE_URL do ambiente; se faltar, tenta
// carregar de .env.local na raiz do repo.
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  try {
    const txt = readFileSync(join(here, '..', '..', '.env.local'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* sem .env.local — segue com o ambiente atual */
  }
}

loadEnvLocal();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ DATABASE_URL ausente. Rode com a env carregada (set -a; . ./.env.local; set +a).');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
try {
  const text = readFileSync(join(here, 'dev-admin.sql'), 'utf8');
  await sql.unsafe(text);
  console.log('✓ seed admin aplicado (admin@abilar.com.br / Abilar@2026)');
} catch (e) {
  console.error('✗ falha no seed admin:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
