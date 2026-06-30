import { teams } from '@/data/teams';
import type { MatchStatus } from '@/lib/types';
import type { FdScore, FdStatus, FdTeam } from './types';

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

export interface ExtractedScore {
  /** Placar de campo (tempo normal + prorrogação). */
  home: number | null;
  away: number | null;
  /** Placar da disputa de pênaltis (null quando não houve). */
  homePenalties: number | null;
  awayPenalties: number | null;
}

/**
 * Extrai o placar correto do objeto `score` da football-data v4.
 *
 * Cuidado com a semântica da API em jogos de mata-mata decididos nos pênaltis:
 *  - `fullTime` é o AGREGADO já somando os gols da disputa (1x1 vira 5x6);
 *  - o placar real da partida fica em `regularTime` (+ `extraTime`);
 *  - o campo `penalties` é pouco confiável (chega a vir empatado, ex.: 5x5).
 *
 * Por isso, quando há disputa de pênaltis, usamos `regularTime + extraTime`
 * como placar de campo e o shootout é, por definição do projeto,
 * `fullTime − regularTime` (o `fullTime` da API = regularTime + pênaltis).
 */
export function extractScore(score: FdScore | undefined): ExtractedScore {
  const empty: ExtractedScore = {
    home: null,
    away: null,
    homePenalties: null,
    awayPenalties: null,
  };
  if (!score) return empty;

  const sum = (a: number | null | undefined, b: number | null | undefined) =>
    a == null && b == null ? null : (a ?? 0) + (b ?? 0);

  // Placar de campo = tempo normal + prorrogação. Quando a API detalha
  // `regularTime` (mata-mata), usamos ele; senão `fullTime` é o placar de campo
  // (jogos regulares e de prorrogação sem pênaltis têm fullTime == regular+extra).
  const home =
    score.regularTime != null
      ? sum(score.regularTime.home, score.extraTime?.home)
      : score.fullTime?.home ?? null;
  const away =
    score.regularTime != null
      ? sum(score.regularTime.away, score.extraTime?.away)
      : score.fullTime?.away ?? null;

  // Pênaltis apenas quando houve disputa. Regra do projeto: o placar do
  // shootout é `fullTime − regularTime` (ignoramos o campo `penalties` da API,
  // que é pouco confiável). Calculamos contra `regularTime`, não contra o
  // placar de campo.
  if (score.duration !== 'PENALTY_SHOOTOUT') {
    return { home, away, homePenalties: null, awayPenalties: null };
  }

  const ftHome = score.fullTime?.home;
  const ftAway = score.fullTime?.away;
  const rtHome = score.regularTime?.home;
  const rtAway = score.regularTime?.away;
  const homePenalties = ftHome != null && rtHome != null ? ftHome - rtHome : null;
  const awayPenalties = ftAway != null && rtAway != null ? ftAway - rtAway : null;

  return { home, away, homePenalties, awayPenalties };
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
