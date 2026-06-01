import 'server-only';
import { createDb, type Database } from '@abilar/db';

// Cliente Drizzle no servidor. Em dev usa DATABASE_URL (session pooler).
// TODO(Workers): usar getCloudflareContext().env.HYPERDRIVE.connectionString.
let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL ausente (.env.local).');
    _db = createDb(url);
  }
  return _db;
}
