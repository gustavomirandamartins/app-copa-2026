import { teams } from '@/data/teams';
import type { MatchStatus } from '@/lib/types';
import type { FdStatus, FdTeam } from './types';

/**
 * De-para entre football-data e o nosso modelo.
 * Resolução de time: tenta a sigla FIFA (tla) contra teams.code; cai para
 * comparação por nome em inglês; por fim consulta OVERRIDES.
 * Os OVERRIDES devem ser preenchidos ao ver a 1ª resposta real, caso alguma
 * sigla da API divirja da FIFA (ex.: Arábia Saudita, Irã).
 */

const byCode = new Map(teams.map((t) => [t.code.toUpperCase(), t.id]));
const byNameEn = new Map(
  teams.map((t) => [t.nameEn.toLowerCase(), t.id]),
);

/** tla/nome da football-data → nosso id de time. Preencher se necessário. */
const OVERRIDES: Record<string, string> = {
  // exemplos prováveis (confirmar com resposta real):
  KSA: 'ksa', SAU: 'ksa', IRN: 'irn', IRI: 'irn', CIV: 'civ',
  ZAF: 'rsa', // ISO code for South Africa
};

export function resolveTeamId(fd: FdTeam): string | null {
  if (fd.tla) {
    const tla = fd.tla.toUpperCase();
    if (OVERRIDES[tla]) return OVERRIDES[tla];
    if (byCode.has(tla)) return byCode.get(tla)!;
  }
  const name = fd.name?.toLowerCase().trim();
  if (name && byNameEn.has(name)) return byNameEn.get(name)!;
  return null; // não resolvido → o sync registra e ignora
}

/** Status da football-data → nosso MatchStatus. */
export function mapStatus(status: FdStatus): MatchStatus {
  switch (status) {
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live';
    case 'FINISHED':
    case 'AWARDED':
      return 'finished';
    case 'POSTPONED':
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'postponed';
    default:
      return 'scheduled';
  }
}
