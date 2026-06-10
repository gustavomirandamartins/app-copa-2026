import type { FdMatchesResponse, FdStandingsResponse } from './types';

/**
 * Cliente da football-data.org (v4) — SOMENTE servidor.
 * Auth via header X-Auth-Token. Plano grátis cobre a Copa do Mundo.
 * Código da competição da Copa: "WC".
 */

const BASE_URL = 'https://api.football-data.org/v4';
const WORLD_CUP = 'WC';

function token(): string {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error('FOOTBALL_DATA_TOKEN não configurado.');
  return t;
}

async function fdFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': token() },
    // Sem cache do fetch: quem controla o ritmo é o cron + Supabase.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`football-data ${path} → HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Todos os 104 jogos da Copa (1 requisição). */
export function getWorldCupMatches(): Promise<FdMatchesResponse> {
  return fdFetch<FdMatchesResponse>(`/competitions/${WORLD_CUP}/matches`);
}

/** Classificação dos 12 grupos com desempates já aplicados (1 requisição). */
export function getWorldCupStandings(): Promise<FdStandingsResponse> {
  return fdFetch<FdStandingsResponse>(`/competitions/${WORLD_CUP}/standings`);
}

export function isFootballDataConfigured(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_TOKEN);
}
