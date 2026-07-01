import Link from 'next/link';
import { Trophy, Medal, Award, Info, ChevronDown, Crown, Zap, BookOpen } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROUND_ORDER, ROUND_LABELS, ROUND_BONUS_POINTS, ROUND_END_DATES, roundKeyForMatch, type RoundKey } from '@/lib/bolao/rounds';
import { RankingList, type RankedUserRow } from '@/components/ranking/RankingList';
import { RoundClassification, type RoundOption } from '@/components/ranking/RoundClassification';
import {
  detectGeneralTieGroups,
  detectRoundTieGroups,
  applyDraw,
  type GeneralRow,
  type DrawRecord,
} from '@/lib/bolao/tiebreak';
import {
  buildGeneralRanking,
  type GeneralRankedUser,
  type GeneralTiebreak,
  type GeneralBreakdown,
} from '@/lib/bolao/generalRanking';
import './ranking.css';

export const revalidate = 0;

const ADMIN_NAME = 'Gustavo Martins';
const normalizeName = (s: string | null) => (s ?? '').trim().toLowerCase();
const isAdminName = (s: string | null) => normalizeName(s) === normalizeName(ADMIN_NAME);

type RankedUser = GeneralRankedUser;

interface RoundRow {
  user_id: string;
  full_name: string | null;
  round_key: string;
  points: number;
  exact_pts: number;
  diff_pts: number;
  winner_pts: number;
  place: number | null;
  bonus: number;
  complete: boolean;
  is_winner: boolean;
  is_admin: boolean;
}

const PRIZES = [
  {
    place: '1º lugar',
    className: 'first',
    icon: Trophy,
    items: [
      '6 latas MinduIPA',
      '6 copos MinduBier',
      'Camisa MinduBier 10 Anos',
      'Boné MinduBier 10 Anos',
      'Copo Térmico MinduBier 10 Anos',
    ],
  },
  {
    place: '2º lugar',
    className: '',
    icon: Medal,
    items: ['3 latas MinduIPA', '3 copos MinduBier', 'Camisa MinduBier 10 Anos'],
  },
  {
    place: '3º lugar',
    className: '',
    icon: Award,
    items: ['2 latas MinduIPA', '2 copos MinduBier', 'Boné MinduBier 10 Anos'],
  },
  {
    place: '4º lugar',
    className: '',
    icon: Award,
    items: ['1 lata MinduIPA', '1 copo MinduBier'],
  },
  {
    place: '5º lugar',
    className: '',
    icon: Award,
    items: ['1 copo MinduBier'],
  },
  {
    place: 'Bônus por rodada',
    className: 'round',
    icon: Zap,
    items: [
      '1º: 50 pts · 2º: 30 pts · 3º: 20 pts · 4º: 10 pts · 5º: 5 pts',
      'Grupos: 3 rodadas (24 jogos cada)',
      '16-avos (16), oitavas (8), quartas (4) e semifinais (2)',
    ],
  },
];

const EMPTY_TB: GeneralTiebreak = {
  prediction_pts: 0, exact_tiebreak_pts: 0, diff_tiebreak_pts: 0,
  final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0,
};
const EMPTY_BD: GeneralBreakdown = {
  exact_pts: 0, diff_pts: 0, winner_pts: 0,
  exact_count: 0, diff_count: 0, winner_count: 0,
  exact_turbo_count: 0, diff_turbo_count: 0, winner_turbo_count: 0,
};

const DEMO_RANKING: RankedUser[] = [
  { id: '1', full_name: 'Ana Souza',    total_score: 87, is_admin: false, referral_bonus: 5,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 82, exact_tiebreak_pts: 40, diff_tiebreak_pts: 27 }, breakdown: { ...EMPTY_BD, exact_pts: 40, diff_pts: 27, winner_pts: 15 } },
  { id: '2', full_name: 'Bruno Lima',   total_score: 81, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 81, exact_tiebreak_pts: 35, diff_tiebreak_pts: 30 }, breakdown: { ...EMPTY_BD, exact_pts: 35, diff_pts: 30, winner_pts: 16 } },
  { id: '3', full_name: 'Carla Mendes', total_score: 76, is_admin: false, referral_bonus: 5,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 71, exact_tiebreak_pts: 25, diff_tiebreak_pts: 30 }, breakdown: { ...EMPTY_BD, exact_pts: 25, diff_pts: 30, winner_pts: 16 } },
  { id: '4', full_name: 'Diego Alves',  total_score: 64, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 64, exact_tiebreak_pts: 20, diff_tiebreak_pts: 24 }, breakdown: { ...EMPTY_BD, exact_pts: 20, diff_pts: 24, winner_pts: 20 } },
  { id: '5', full_name: 'Elaine Costa', total_score: 59, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 59, exact_tiebreak_pts: 10, diff_tiebreak_pts: 21 }, breakdown: { ...EMPTY_BD, exact_pts: 10, diff_pts: 21, winner_pts: 28 } },
  { id: '6', full_name: 'Felipe Rocha', total_score: 48, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 48, exact_tiebreak_pts: 0,  diff_tiebreak_pts: 18 }, breakdown: { ...EMPTY_BD, exact_pts: 0,  diff_pts: 18, winner_pts: 30 } },
];

function toGeneralRow(user: RankedUser, roundBonuses: Array<{ roundKey: string; label: string; pts: number }>): RankedUserRow {
  return {
    id: user.id,
    full_name: user.full_name,
    score: user.total_score,
    is_admin: user.is_admin,
    breakdown: {
      exact_pts: user.breakdown.exact_pts,
      diff_pts: user.breakdown.diff_pts,
      winner_pts: user.breakdown.winner_pts,
      exact_count: user.breakdown.exact_count,
      diff_count: user.breakdown.diff_count,
      winner_count: user.breakdown.winner_count,
      exact_turbo_count: user.breakdown.exact_turbo_count,
      diff_turbo_count: user.breakdown.diff_turbo_count,
      winner_turbo_count: user.breakdown.winner_turbo_count,
      prediction_pts: user.tb.prediction_pts,
      round_bonuses: roundBonuses,
      referral_bonus: user.referral_bonus,
      score_adjustment: user.score_adjustment,
    },
  };
}

type RoundBreakdown = {
  exact_pts: number;
  diff_pts: number;
  winner_pts: number;
  exact_count: number;
  diff_count: number;
  winner_count: number;
  exact_turbo_count: number;
  diff_turbo_count: number;
  winner_turbo_count: number;
};

function emptyRoundBreakdown(): RoundBreakdown {
  return {
    exact_pts: 0, diff_pts: 0, winner_pts: 0,
    exact_count: 0, diff_count: 0, winner_count: 0,
    exact_turbo_count: 0, diff_turbo_count: 0, winner_turbo_count: 0,
  };
}

function toRoundRow(row: RoundRow, bd: RoundBreakdown): RankedUserRow {
  return {
    id: row.user_id,
    full_name: row.full_name,
    score: row.points,
    is_admin: row.is_admin,
    is_winner: row.is_winner,
    round_bonus: row.bonus,
    breakdown: {
      exact_pts: bd.exact_pts,
      diff_pts: bd.diff_pts,
      winner_pts: bd.winner_pts,
      exact_count: bd.exact_count,
      diff_count: bd.diff_count,
      winner_count: bd.winner_count,
      exact_turbo_count: bd.exact_turbo_count,
      diff_turbo_count: bd.diff_turbo_count,
      winner_turbo_count: bd.winner_turbo_count,
      prediction_pts: row.points,
      round_bonuses: [],
      referral_bonus: 0,
      score_adjustment: 0,
    },
  };
}

export default async function RankingPage() {
  const configured = isSupabaseConfigured();
  let ranking: RankedUser[] = [];
  let roundRows: RoundRow[] = [];
  let roundBonusMap = new Map<string, Array<{ roundKey: string; label: string; pts: number }>>();
  let roundBreakdownMap = new Map<string, RoundBreakdown>();

  if (configured) {
    const admin = createAdminClient();

    // Palpites paginados (o PostgREST corta em 1000 linhas; sem paginar,
    // os desempates ficam errados quando há mais de 1000 palpites).
    type PredRow = { user_id: string; match_id: string; points_earned: number; base_points: number | null };
    const fetchAllPreds = async (): Promise<PredRow[]> => {
      const pageSize = 1000;
      const all: PredRow[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data } = await admin
          .from('predictions')
          .select('user_id, match_id, points_earned, base_points')
          .not('points_earned', 'is', null)
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);
        const rows = (data ?? []) as PredRow[];
        all.push(...rows);
        if (rows.length < pageSize) break;
      }
      return all;
    };

    const [
      { data: profilesData },
      preds,
      { data: roundScoresData },
    ] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, total_score, is_admin, referral_bonus, score_adjustment')
        .eq('agreed_to_ranking', true),
      fetchAllPreds(),
      admin
        .from('round_scores')
        .select('user_id, round_key, points, exact_pts, diff_pts, place, bonus, complete, is_winner'),
    ]);

    const profiles = (profilesData ?? []) as {
      id: string; full_name: string | null; total_score: number; is_admin: boolean;
      referral_bonus: number; score_adjustment: number;
    }[];
    const rScores  = (roundScoresData ?? []) as {
      user_id: string; round_key: string; points: number; exact_pts: number; diff_pts: number;
      place: number | null; bonus: number; complete: boolean; is_winner: boolean;
    }[];

    // ── Classificação geral (mesmos critérios de desempate da home) ──────
    ranking = buildGeneralRanking(profiles, preds);

    // ── Bônus de rodada por usuário (escalonado: lê o bônus já gravado) ──
    for (const r of rScores) {
      if (r.bonus <= 0) continue;
      const list = roundBonusMap.get(r.user_id) ?? [];
      list.push({
        roundKey: r.round_key,
        label: `${ROUND_LABELS[r.round_key as RoundKey] ?? r.round_key}${r.place ? ` · ${r.place}º` : ''}`,
        pts: r.bonus,
      });
      roundBonusMap.set(r.user_id, list);
    }

    const nameMap    = new Map<string, string | null>(profiles.map((p) => [p.id, p.full_name]));
    const isAdminMap = new Map<string, boolean>(profiles.map((p) => [p.id, p.is_admin ?? false]));

    // ── Breakdown por rodada (pontos COM multiplicador turbinado) ────────
    // Os campos exact_pts/diff_pts vindos da round_scores servem para
    // desempate (contagem × base, sem turbo). Para o breakdown de exibição
    // precisamos dos pontos reais (com turbo), senão a soma por categoria
    // não bate com prediction_pts. Recalculamos a partir dos palpites brutos,
    // acumulando points_earned (já com turbo) em cada bucket de base_points.
    roundBreakdownMap = new Map<string, RoundBreakdown>();
    for (const p of preds) {
      const rk = roundKeyForMatch(p.match_id);
      if (!rk) continue;
      const pts = p.points_earned ?? 0;
      const base = p.base_points ?? 0;
      if (base === 0 && pts === 0) continue; // sem acerto, não entra no breakdown
      const key = `${p.user_id}::${rk}`;
      const bd = roundBreakdownMap.get(key) ?? emptyRoundBreakdown();
      // base_points inclui o bônus de +1 por pênaltis certos num mata-mata
      // empatado (5→6, 3→4) — checar só "=== 5"/"=== 3" perdia esses acertos.
      if (base === 5 || base === 6) { bd.exact_pts  += pts; bd.exact_count  += 1; if (pts > base) bd.exact_turbo_count  += 1; }
      if (base === 3 || base === 4) { bd.diff_pts   += pts; bd.diff_count   += 1; if (pts > base) bd.diff_turbo_count   += 1; }
      if (base === 1)                { bd.winner_pts += pts; bd.winner_count += 1; if (pts > base) bd.winner_turbo_count += 1; }
      roundBreakdownMap.set(key, bd);
    }

    roundRows = rScores
      .filter((r) => ROUND_ORDER.includes(r.round_key as RoundKey))
      .map((r) => ({
        user_id: r.user_id,
        round_key: r.round_key,
        points: r.points,
        exact_pts: r.exact_pts,
        diff_pts: r.diff_pts,
        winner_pts: r.exact_pts, // placeholder não usado pelo breakdown agora
        place: r.place,
        bonus: r.bonus,
        complete: r.complete,
        is_winner: r.is_winner,
        full_name: nameMap.get(r.user_id) ?? null,
        is_admin: isAdminMap.get(r.user_id) ?? false,
      }));
  } else {
    ranking = DEMO_RANKING;
  }

  // ── Sorteios de desempate ────────────────────────────────────────────────
  // Lê sorteios do banco (degrada graciosamente se a tabela não existir ainda).
  const drawsByKey = new Map<string, DrawRecord>();
  if (configured) {
    try {
      const adminForDraws = createAdminClient();
      const { data: drawsData } = await adminForDraws
        .from('tiebreak_draws')
        .select('scope, signature, ordering');
      for (const d of (drawsData ?? []) as Array<{ scope: string; signature: string; ordering: string[] }>) {
        drawsByKey.set(`${d.scope}|${d.signature}`, {
          scope: d.scope as DrawRecord['scope'],
          signature: d.signature,
          ordering: d.ordering,
        });
      }
    } catch {
      // Tabela pode não existir ainda (antes da migração); não quebra a página.
    }
  }

  // Flags de empate na Geral
  const generalPendingIds = new Set<string>();
  const generalDecidedIds = new Set<string>();

  if (configured) {
    const generalRowsForTie: GeneralRow[] = ranking.map((u) => ({
      id: u.id,
      is_admin: u.is_admin,
      tb: {
        total_score: u.total_score,
        prediction_pts: u.tb.prediction_pts,
        exact_pts: u.tb.exact_tiebreak_pts,
        diff_pts: u.tb.diff_tiebreak_pts,
        final_pts: u.tb.final_pts,
        semi_pts: u.tb.semi_pts,
        quarters_pts: u.tb.quarters_pts,
        ro16_pts: u.tb.ro16_pts,
      },
    }));
    const generalTieGroups = detectGeneralTieGroups(generalRowsForTie);
    for (const group of generalTieGroups) {
      const draw = drawsByKey.get(`${group.scope}|${group.signature}`);
      const result = applyDraw(group, draw);
      if (result.pending) group.memberIds.forEach((id) => generalPendingIds.add(id));
      else result.decidedIds.forEach((id) => generalDecidedIds.add(id));
    }
  }

  // Flags de empate por rodada
  const roundPendingIds = new Map<RoundKey, Set<string>>();
  const roundDecidedIds = new Map<RoundKey, Set<string>>();

  const byRound = new Map<RoundKey, RoundRow[]>();
  for (const r of roundRows) {
    const key = r.round_key as RoundKey;
    const list = byRound.get(key) ?? [];
    list.push(r);
    byRound.set(key, list);
  }

  // Ordena os participantes de uma rodada pela pontuação (com desempate),
  // deixando o admin INTERCALADO pela sua pontuação — a colocação dele vira
  // "—" e a numeração pula para o próximo (igual à classificação geral).
  const sortRound = (rows: RoundRow[]) =>
    [...rows].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exact_pts !== a.exact_pts) return b.exact_pts - a.exact_pts;
      if (b.diff_pts !== a.diff_pts) return b.diff_pts - a.diff_pts;
      return (a.place ?? Number.POSITIVE_INFINITY) - (b.place ?? Number.POSITIVE_INFINITY);
    });

  // Campeões: rodadas encerradas com vencedor + ranking completo da rodada.
  const champions = ROUND_ORDER.flatMap((key) => {
    const rows = byRound.get(key);
    if (!rows || !rows[0]?.complete) return [];
    const winners = rows.filter((r) => r.is_winner);
    if (winners.length === 0) return [];
    return [{ key, winners, points: winners[0].points, allRows: sortRound(rows) }];
  });

  // Rodada vigente = primeira rodada (na ordem) que ainda NÃO está encerrada.
  const completeKeys = new Set<RoundKey>(
    ROUND_ORDER.filter((key) => byRound.get(key)?.[0]?.complete)
  );
  const vigenteKey: RoundKey =
    ROUND_ORDER.find((key) => !completeKeys.has(key)) ?? ROUND_ORDER[ROUND_ORDER.length - 1];

  const fmtEnd = (key: RoundKey): string | null => {
    const dateUTC = ROUND_END_DATES[key];
    if (!dateUTC) return null;
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric', month: 'long', timeZone: 'America/Bahia',
    }).format(new Date(dateUTC));
  };

  // ── Converte para o formato do componente cliente ───────────────────
  const generalRows: RankedUserRow[] = ranking.map((u) => {
    const row = toGeneralRow(u, roundBonusMap.get(u.id) ?? []);
    if (!u.is_admin) {
      row.pendingDraw   = generalPendingIds.has(u.id);
      row.decidedByDraw = generalDecidedIds.has(u.id);
    }
    return row;
  });

  // Opções do seletor de rodada: rodadas com dados + a rodada vigente.
  const roundOptions: RoundOption[] = ROUND_ORDER.filter(
    (key) => byRound.has(key) || key === vigenteKey
  ).map((key) => {
    const rows = byRound.get(key) ?? [];
    const sortedRows = sortRound(rows);

    // Detecção de empates da rodada (só para rodadas encerradas).
    if (rows[0]?.complete && configured) {
      const pending = roundPendingIds.get(key) ?? new Set<string>();
      const decided = roundDecidedIds.get(key) ?? new Set<string>();
      const roundRowsForTie = sortedRows
        .filter((r) => !r.is_admin)
        .map((r) => ({ user_id: r.user_id, is_admin: false, points: r.points, exact_pts: r.exact_pts, diff_pts: r.diff_pts }));
      const tieGroups = detectRoundTieGroups(roundRowsForTie, key);
      for (const group of tieGroups) {
        const draw = drawsByKey.get(`${group.scope}|${group.signature}`);
        const result = applyDraw(group, draw);
        if (result.pending) group.memberIds.forEach((id) => pending.add(id));
        else result.decidedIds.forEach((id) => decided.add(id));
      }
      roundPendingIds.set(key, pending);
      roundDecidedIds.set(key, decided);
    }

    return {
      key,
      label: ROUND_LABELS[key],
      complete: rows[0]?.complete ?? false,
      endLabel: fmtEnd(key),
      bonusTop: ROUND_BONUS_POINTS,
      rows: sortedRows.map((r) => {
        const row = toRoundRow(r, roundBreakdownMap.get(`${r.user_id}::${key}`) ?? emptyRoundBreakdown());
        if (!r.is_admin) {
          row.pendingDraw   = roundPendingIds.get(key)?.has(r.user_id) ?? false;
          row.decidedByDraw = roundDecidedIds.get(key)?.has(r.user_id) ?? false;
        }
        return row;
      }),
    };
  });

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: 'var(--space-sm)' }}>
          <Trophy
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Classificação por Rodada e Final
        </h1>
      </section>

      {/* Prêmios (dropdown) */}
      <details className="prizes-dropdown animate-slide-up">
        <summary className="prizes-summary glass-card-static">
          <span className="prizes-summary-title">
            <Trophy size={18} style={{ color: 'var(--gold)' }} />
            PREMIAÇÃO PARCIAL E FINAL
          </span>
          <ChevronDown size={18} className="prizes-chevron" />
        </summary>
        <div className="prizes-grid">
          {PRIZES.map((prize) => {
            const Icon = prize.icon;
            return (
              <div
                key={prize.place}
                className={`glass-card-static prize-card ${prize.className}`}
              >
                <div className="prize-place">
                  <Icon size={22} style={{ color: 'var(--gold)' }} />
                  {prize.place}
                </div>
                <ul className="prize-items">
                  {prize.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>

      {/* Regras (dropdown) */}
      <details className="prizes-dropdown rules-dropdown animate-slide-up" style={{ marginBottom: 'var(--space-xl)' }}>
        <summary className="prizes-summary glass-card-static">
          <span className="prizes-summary-title">
            <BookOpen size={18} style={{ color: 'var(--gold)' }} />
            REGRAS E CRITÉRIOS DE DESEMPATE
          </span>
          <ChevronDown size={18} className="prizes-chevron" />
        </summary>

        <div className="rules-body">

          {/* Pontuação por partida */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Pontuação por partida</h4>
            <div className="rules-score-grid">
              <div className="rules-score-row rules-score-exact">
                <span className="rules-pts">5 pts</span>
                <span className="rules-desc">Acertou o <strong>placar exato</strong> (vitória ou empate)</span>
              </div>
              <div className="rules-score-row rules-score-diff">
                <span className="rules-pts">3 pts</span>
                <span className="rules-desc">Acertou o <strong>vencedor e a diferença de gols</strong> (ou acertou o empate com outro placar)</span>
              </div>
              <div className="rules-score-row rules-score-winner">
                <span className="rules-pts">1 pt</span>
                <span className="rules-desc">Acertou apenas o <strong>vencedor</strong></span>
              </div>
              <div className="rules-score-row rules-score-miss">
                <span className="rules-pts">0 pts</span>
                <span className="rules-desc">Errou o vencedor, errou o empate ou não preencheu</span>
              </div>
            </div>
            <p className="rules-note">
              Partidas com <strong>multiplicador de bônus</strong> (⚡) multiplicam os pontos obtidos naquele jogo.
            </p>
          </div>

          {/* Bônus extras */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Bônus</h4>
            <ul className="rules-list">
              <li><strong>Bônus de rodada (+50 pts):</strong> o 1º colocado de cada rodada ao fim dela recebe 50 pontos extras na classificação geral.</li>
              <li><strong>Bônus de rodada (+30 pts):</strong> o 2º colocado de cada rodada ao fim dela recebe 30 pontos extras na classificação geral.</li>
              <li><strong>Bônus de rodada (+20 pts):</strong> o 3º colocado de cada rodada ao fim dela recebe 20 pontos extras na classificação geral.</li>
              <li><strong>Bônus de rodada (+10 pts):</strong> o 4º colocado de cada rodada ao fim dela recebe 10 pontos extras na classificação geral.</li>
              <li><strong>Bônus de rodada (+5 pts):</strong> o 5º colocado de cada rodada ao fim dela recebe 5 pontos extras na classificação geral.</li>
              <li><strong>Bônus de indicação (+5 pts):</strong> cada amigo indicado que entrar no Bolão e tiver o cadastro aprovado vale +5 pts.</li>
              <li><strong>Bônus ou ônus especial:</strong> que pode ser concedido pelo Admin (aumento ou diminuição de pontos).</li>
            </ul>
          </div>

          {/* Classificação geral */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Classificação geral</h4>
            <ul className="rules-list">
              <li><strong>É a que vale para a premiação final!</strong></li>
              <li>Soma de todos os pontos de palpite ao longo de toda a Copa, além dos bônus de rodada, de indicação, e especiais.</li>
              <li>Os <strong>5 primeiros colocados</strong> ao final da Copa recebem premiação em produtos exclusivos MinduBier.</li>
            </ul>
          </div>

          {/* Classificação por rodada */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Classificação por rodada</h4>
            <ul className="rules-list">
              <li><strong>É a que vale para ganhar os pontos de bônus da rodada!</strong></li>
              <li>Rodadas: 3 rodadas na fase de grupos (24 jogos cada), 16-avos (16 jogos), oitavas (8 jogos), quartas (4 jogos) e semifinais (2 jogos).</li>
              <li>Soma dos pontos obtidos apenas nos palpites das partidas da respectiva rodada (pontos de bônus não valem, nem palpites de partidas de rodadas anteriores).</li>
              <li>Os <strong>5 primeiros classificados</strong> recebem pontuação bônus.</li>
            </ul>
          </div>

          {/* Critérios de desempate */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Critérios de desempate</h4>
            <p className="rules-note" style={{ marginBottom: 'var(--space-sm)' }}>
              Aplicados em caso de empate na pontuação total, nesta ordem:
            </p>
            <ol className="rules-tiebreaker-list">
              <li>
                <span className="rules-tb-num">1</span>
                <span>Quantidade de pontos obtidos em palpites de partidas <em>(sem bônus de rodada nem de indicação)</em></span>
              </li>
              <li>
                <span className="rules-tb-num">2</span>
                <span>Quantidade de pontos obtidos em <strong>acertos de placar exato</strong> <em>(5 pts cada)</em></span>
              </li>
              <li>
                <span className="rules-tb-num">3</span>
                <span>Quantidade de pontos obtidos em <strong>acertos de vencedor + diferença de gols</strong> <em>(3 pts cada)</em></span>
              </li>
              <li className="rules-tb-general-only">
                <span className="rules-tb-num">4</span>
                <span>Pontos obtidos na partida da <strong>Final</strong></span>
              </li>
              <li className="rules-tb-general-only">
                <span className="rules-tb-num">5</span>
                <span>Pontos obtidos nas <strong>Semifinais</strong></span>
              </li>
              <li className="rules-tb-general-only">
                <span className="rules-tb-num">6</span>
                <span>Pontos obtidos nas <strong>Quartas de Final</strong></span>
              </li>
              <li className="rules-tb-general-only">
                <span className="rules-tb-num">7</span>
                <span>Pontos obtidos nas <strong>Oitavas de Final</strong></span>
              </li>
              <li>
                <span className="rules-tb-num">8</span>
                <span>Sorteio ao vivo — em caso de empate absoluto (itens 1–7 idênticos), o organizador realizará um sorteio ao vivo.</span>
              </li>
            </ol>
            <p className="rules-note rules-note-sub">
              * Critérios 4–7 aplicam-se apenas à classificação geral, não à classificação por rodada.
            </p>
          </div>

        </div>
      </details>

      {!configured && (
        <div
          className="glass-card-static"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <Info size={18} style={{ color: 'var(--gold)' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            <strong>Modo demonstração.</strong> Configure o Supabase para exibir
            a classificação real dos participantes.
          </p>
        </div>
      )}

      {/* Classificação por rodada — em evidência a rodada vigente */}
      {roundOptions.length > 0 && (
        <RoundClassification rounds={roundOptions} defaultKey={vigenteKey} />
      )}

      {/* Campeões de rodada */}
      {champions.length > 0 && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>
            <Crown size={18} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 6 }} />
            Campeões de rodada
          </h3>
          <div className="champions-grid">
            {champions.map(({ key, winners, points, allRows }) => (
              <details key={key} className="glass-card-static champion-card">
                <summary>
                  <div>
                    <div className="champion-round">{ROUND_LABELS[key]}</div>
                    <div className="champion-names">
                      {winners.map((w) => (
                        <span key={w.full_name} className="champion-name">
                          <Crown size={14} /> {w.full_name ?? 'Participante'}
                        </span>
                      ))}
                    </div>
                    <div className="champion-meta">
                      {points} pts na rodada · <strong>+{ROUND_BONUS_POINTS} bônus</strong>
                    </div>
                  </div>
                  <ChevronDown size={16} className="champion-chevron" />
                </summary>
                <div className="champion-ranking">
                  {(() => {
                    let pos = 0;
                    return allRows.map((r) => {
                      const isAdminRow = r.is_admin;
                      if (!isAdminRow) pos += 1;
                      return (
                        <div
                          key={r.user_id}
                          className={`champion-rank-row${r.is_winner ? ' is-winner' : ''}`}
                        >
                          <span className="champion-rank-pos">
                            {r.is_winner ? <Crown size={12} /> : isAdminRow ? '—' : `${pos}º`}
                          </span>
                          <span className="champion-rank-name">
                            {r.full_name ?? 'Participante'}
                            {isAdminRow && <span className="champion-rank-tag">fora de competição</span>}
                          </span>
                          <span className="champion-rank-pts">
                            {r.bonus > 0 && <span className="champion-rank-bonus">+{r.bonus}</span>}
                            {r.points} pts
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Classificação geral */}
      <h3 style={{ marginBottom: 'var(--space-md)' }}>Classificação geral</h3>
      {generalRows.length === 0 ? (
        <div className="glass-card-static" style={{ padding: 'var(--space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Ainda não há participantes na classificação.
          </p>
        </div>
      ) : (
        <RankingList users={generalRows} />
      )}
    </div>
  );
}
