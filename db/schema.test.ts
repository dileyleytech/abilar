import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { profiles, carpenterProfiles, architectProfiles, addresses } from './schema';

// Smoke tests do schema (não conectam no banco). A query real de Worker e as
// policies RLS são validadas via migration aplicada no Supabase (ver README).
const cols = (t: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(t).columns.map((c) => c.name).sort();

describe('db schema — Fase 1 (auth e perfis)', () => {
  it('profiles', () => {
    const cfg = getTableConfig(profiles);
    expect(cfg.name).toBe('profiles');
    expect(cols(profiles)).toEqual([
      'created_at',
      'email',
      'id',
      'name',
      'phone',
      'role',
      'updated_at',
    ]);
  });

  it('carpenter_profiles tem campos de matching (cidade/CEP/raio/categorias) e KYC', () => {
    expect(getTableConfig(carpenterProfiles).name).toBe('carpenter_profiles');
    const c = cols(carpenterProfiles);
    for (const f of [
      'user_id',
      'person_type',
      'cnpj_or_cpf',
      'service_city',
      'service_cep',
      'service_radius_km',
      'categories',
      'kyc_status',
    ]) {
      expect(c).toContain(f);
    }
  });

  it('architect_profiles tem comissão configurável', () => {
    expect(getTableConfig(architectProfiles).name).toBe('architect_profiles');
    expect(cols(architectProfiles)).toContain('commission_percent');
  });

  it('addresses referencia o usuário', () => {
    expect(getTableConfig(addresses).name).toBe('addresses');
    expect(cols(addresses)).toContain('user_id');
    expect(cols(addresses)).toContain('cep');
  });
});
