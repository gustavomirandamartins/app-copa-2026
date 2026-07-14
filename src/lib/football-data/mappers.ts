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

  // Placar de campo = tempo normal + prorrogação. Quando a API já detalhou
  // `regularTime` (mata-mata), somamos com `extraTime`; senão `fullTime` é o
  // placar de campo (jogos regulares e de prorrogação sem pênaltis têm
  // fullTime == regular+extra).
  //
  // IMPORTANTE: exige `regularTime.home`/`.away` não-nulos, não só o objeto
  // `regularTime` existir. A API pode entregar `regularTime: { home: null,
  // away: null }` com `extraTime` já preenchido (gol na prorrogação chega
  // antes do tempo normal ser "fechado" pela API) — nesse caso, tratar o
  // null como 0 grava só o gol da prorrogação como se fosse o placar final
  // (foi exatamente isso que aconteceu: 1×0 em vez de 3×2 quando o jogo
  // terminou 2×2 no tempo normal + 1×0 na prorrogação).
  const home =
    score.regularTime?.home != null
      ? score.regularTime.home + (score.extraTime?.home ?? 0)
      : score.fullTime?.home ?? null;
  const away =
    score.regularTime?.away != null
      ? score.regularTime.away + (score.extraTime?.away ?? 0)
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

/** Parciais detalhadas para os palpites extras (match_extra_results). */
export interface ExtractedExtraScore {
  htHome: number | null;
  htAway: number | null;
  rtHome: number | null;
  rtAway: number | null;
  etHome: number | null;
  etAway: number | null;
  penHome: number | null;
  penAway: number | null;
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null;
}

/**
 * Extrai as parciais do objeto `score` para os palpites extras: 1º tempo,
 * tempo regulamentar (90min), prorrogação (agregado) e pênaltis. Pênaltis
 * seguem a MESMA regra do projeto usada em extractScore (`fullTime −
 * regularTime`; o campo `penalties` da API é pouco confiável). O 2º tempo
 * NÃO é extraído — é derivado na apuração (rt − ht).
 */
export function extractExtraScore(score: FdScore | undefined): ExtractedExtraScore {
  const empty: ExtractedExtraScore = {
    htHome: null, htAway: null,
    rtHome: null, rtAway: null,
    etHome: null, etAway: null,
    penHome: null, penAway: null,
    duration: null,
  };
  if (!score) return empty;

  const duration =
    score.duration === 'REGULAR' || score.duration === 'EXTRA_TIME' || score.duration === 'PENALTY_SHOOTOUT'
      ? score.duration
      : null;

  let penHome: number | null = null;
  let penAway: number | null = null;
  if (score.duration === 'PENALTY_SHOOTOUT') {
    const ftHome = score.fullTime?.home;
    const ftAway = score.fullTime?.away;
    const rtHome = score.regularTime?.home;
    const rtAway = score.regularTime?.away;
    penHome = ftHome != null && rtHome != null ? ftHome - rtHome : null;
    penAway = ftAway != null && rtAway != null ? ftAway - rtAway : null;
  }

  return {
    htHome: score.halfTime?.home ?? null,
    htAway: score.halfTime?.away ?? null,
    rtHome: score.regularTime?.home ?? null,
    rtAway: score.regularTime?.away ?? null,
    // extraTime só é uma parcial real quando a prorrogação aconteceu; em
    // jogos decididos no tempo normal a API preenche 0x0, que gravado
    // confundiria a apuração ("prorrogação 0x0" ≠ "não houve prorrogação").
    etHome: duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT' ? score.extraTime?.home ?? null : null,
    etAway: duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT' ? score.extraTime?.away ?? null : null,
    penHome,
    penAway,
    duration,
  };
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
