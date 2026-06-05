import { describe, it, expect } from 'vitest';
import { roleFromClaims, nameFromClaims, idFromClaims } from './claims';

describe('roleFromClaims', () => {
  it('lê o papel do claim `user_role` (injetado pelo access token hook)', () => {
    expect(roleFromClaims({ user_role: 'CARPENTER' })).toBe('CARPENTER');
    expect(roleFromClaims({ user_role: 'ADMIN' })).toBe('ADMIN');
  });

  it('aceita o papel em app_metadata.role como fallback', () => {
    expect(roleFromClaims({ app_metadata: { role: 'CLIENT' } })).toBe('CLIENT');
  });

  it('prefere user_role a app_metadata.role', () => {
    expect(roleFromClaims({ user_role: 'ADMIN', app_metadata: { role: 'CLIENT' } })).toBe('ADMIN');
  });

  it('NUNCA confunde o claim `role` do Postgres (authenticated) com o papel do app', () => {
    // `role` no JWT do Supabase é o role do banco (authenticated/anon), não o nosso.
    expect(roleFromClaims({ role: 'authenticated' })).toBeNull();
  });

  it('retorna null p/ papel ausente, desconhecido ou claims nulos', () => {
    expect(roleFromClaims({ user_role: 'SUPERUSER' })).toBeNull();
    expect(roleFromClaims({ user_role: 123 })).toBeNull();
    expect(roleFromClaims({})).toBeNull();
    expect(roleFromClaims(null)).toBeNull();
    expect(roleFromClaims(undefined)).toBeNull();
  });
});

describe('nameFromClaims', () => {
  it('lê o nome de `user_name` (hook) com fallback a user_metadata.name', () => {
    expect(nameFromClaims({ user_name: 'Ana Marceneira' })).toBe('Ana Marceneira');
    expect(nameFromClaims({ user_metadata: { name: 'João' } })).toBe('João');
  });

  it('retorna null p/ nome ausente ou vazio', () => {
    expect(nameFromClaims({ user_name: '' })).toBeNull();
    expect(nameFromClaims({})).toBeNull();
    expect(nameFromClaims(null)).toBeNull();
  });
});

describe('idFromClaims', () => {
  it('lê o `sub` (id do usuário) quando é string', () => {
    expect(idFromClaims({ sub: 'uuid-123' })).toBe('uuid-123');
  });

  it('retorna null sem sub válido', () => {
    expect(idFromClaims({})).toBeNull();
    expect(idFromClaims({ sub: 42 })).toBeNull();
    expect(idFromClaims(null)).toBeNull();
  });
});
