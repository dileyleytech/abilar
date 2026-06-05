// Leitura PURA das claims do JWT do Supabase. Sem rede, sem imports de servidor —
// `getClaims()` valida o token localmente (signing keys assimétricas) e nós só
// mapeamos os campos. O papel vem do Custom Access Token Hook (claim `user_role`);
// `session.ts` faz fallback à tabela `profiles` quando o claim ainda não existe.
import { ROLES, type Role } from '@abilar/shared';

/** Claims decodificadas do access token (formato livre — chave→valor). */
export type Claims = Record<string, unknown> | null | undefined;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/** Papel do app a partir do JWT. Lê `user_role` (hook) ou `app_metadata.role`.
 *  ATENÇÃO: o claim `role` padrão do Supabase é o role do Postgres
 *  (`authenticated`/`anon`) — NUNCA o papel do app. Por isso só lemos `user_role`. */
export function roleFromClaims(claims: Claims): Role | null {
  if (!claims) return null;
  const raw = claims.user_role ?? asRecord(claims.app_metadata)?.role;
  return typeof raw === 'string' && (ROLES as readonly string[]).includes(raw) ? (raw as Role) : null;
}

/** Nome de exibição a partir do JWT (`user_name` do hook, ou user_metadata.name). */
export function nameFromClaims(claims: Claims): string | null {
  const raw = claims?.user_name ?? asRecord(claims?.user_metadata)?.name;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

/** Id do usuário (`sub`). */
export function idFromClaims(claims: Claims): string | null {
  return typeof claims?.sub === 'string' ? claims.sub : null;
}
