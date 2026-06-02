import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  profiles,
  carpenterProfiles,
  architectProfiles,
  addresses,
  projects,
  modules,
  projectPhotos,
} from './schema';

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

  it('projects é container com nome (sem categoria/workType) + índice de feed', () => {
    const cfg = getTableConfig(projects);
    expect(cfg.name).toBe('projects');
    for (const f of ['client_id', 'title', 'status', 'source_type']) {
      expect(cols(projects)).toContain(f);
    }
    expect(cols(projects)).not.toContain('category');
    expect(cfg.indexes.map((i) => i.config.name)).toContain('projects_status_created_idx');
  });

  it('modules guarda cômodo, tipo, workType e dimensões em mm', () => {
    expect(getTableConfig(modules).name).toBe('modules');
    for (const f of ['project_id', 'ambiente', 'type', 'work_type', 'width_mm', 'height_mm', 'depth_mm']) {
      expect(cols(modules)).toContain(f);
    }
  });

  it('project_photos referencia o projeto e guarda o path', () => {
    expect(getTableConfig(projectPhotos).name).toBe('project_photos');
    for (const f of ['project_id', 'kind', 'path', 'is_current']) {
      expect(cols(projectPhotos)).toContain(f);
    }
  });
});
