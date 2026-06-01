import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { profiles } from './schema';

// Smoke test do schema (não conecta no banco — a query real de Worker exige
// credenciais Supabase, validada manualmente na Fase 0; ver README).
describe('db schema — profiles', () => {
  it('tem o nome e colunas esperados', () => {
    const cfg = getTableConfig(profiles);
    expect(cfg.name).toBe('profiles');
    const cols = cfg.columns.map((c) => c.name).sort();
    expect(cols).toEqual(['created_at', 'id', 'name', 'phone', 'role']);
  });
});
