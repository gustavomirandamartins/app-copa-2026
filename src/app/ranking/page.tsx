import Link from 'next/link';
import { Trophy, Medal, Award, Info, ArrowLeft, ChevronDown, Crown, Zap, BookOpen } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROUND_ORDER, ROUND_LABELS, ROUND_BONUS_POINTS, ROUND_END_DATES, type RoundKey } from '@/lib/bolao/rounds';
import { RankingList, type RankedUserRow } from '@/components/ranking/RankingList';
import { RoundClassification, type RoundOption } from '@/components/ranking/RoundClassification';
import './ranking.css';

export const revalidate = 0;

const ADMIN_NAME = 'Gustavo Martins';
const normalizeName = (s: string | null) => (s ?? '').trim().toLowerCase();
const isAdminName = (s: string | null) => normalizeName(s) === normalizeName(ADMIN_NAME);

interface Tiebreakers {
  prediction_pts: number;
  exact_pts: number;
  diff_pts: number;
  winner_pts: number;
  final_pts: number;
  semi_pts: number;
  quarters_pts: number;
  ro16_pts: number;
}

interface RankedUser {
  id: string;
  full_name: string | null;
  total_score: number;
  is_admin: boolean;
  referral_bonus: number;
  score_adjustment: number;
  tb: Tiebreakers;
}

interface RoundRow {
  user_id: string;
  full_name: string | null;
  round_key: string;
  points: number;
  exact_pts: number;
  diff_pts: number;
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

const EMPTY_TB: Tiebreakers = { prediction_pts: 0, exact_pts: 0, diff_pts: 0, winner_pts: 0, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 };

const DEMO_RANKING: RankedUser[] = [
  { id: '1', full_name: 'Ana Souza',    total_score: 87, is_admin: false, referral_bonus: 5,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 82, exact_pts: 40, diff_pts: 27, winner_pts: 15 } },
  { id: '2', full_name: 'Bruno Lima',   total_score: 81, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 81, exact_pts: 35, diff_pts: 30, winner_pts: 16 } },
  { id: '3', full_name: 'Carla Mendes', total_score: 76, is_admin: false, referral_bonus: 5,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 71, exact_pts: 25, diff_pts: 30, winner_pts: 16 } },
  { id: '4', full_name: 'Diego Alves',  total_score: 64, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 64, exact_pts: 20, diff_pts: 24, winner_pts: 20 } },
  { id: '5', full_name: 'Elaine Costa', total_score: 59, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 59, exact_pts: 10, diff_pts: 21, winner_pts: 28 } },
  { id: '6', full_name: 'Felipe Rocha', total_score: 48, is_admin: false, referral_bonus: 0,  score_adjustment: 0, tb: { ...EMPTY_TB, prediction_pts: 48, exact_pts: 0,  diff_pts: 18, winner_pts: 30 } },
];

function compareTiebreakers(a: Tiebreakers, b: Tiebreakers): number {
  if (b.prediction_pts !== a.prediction_pts) return b.prediction_pts - a.prediction_pts;
  if (b.exact_pts      !== a.exact_pts)      return b.exact_pts      - a.exact_pts;
  if (b.diff_pts       !== a.diff_pts)       return b.diff_pts       - a.diff_pts;
  if (b.final_pts      !== a.final_pts)      return b.final_pts      - a.final_pts;
  if (b.semi_pts       !== a.semi_pts)       return b.semi_pts       - a.semi_pts;
  if (b.quarters_pts   !== a.quarters_pts)   return b.quarters_pts   - a.quarters_pts;
  if (b.ro16_pts       !== a.ro16_pts)       return b.ro16_pts       - a.ro16_pts;
  return 0;
}

function toGeneralRow(user: RankedUser, roundBonuses: Array<{ roundKey: string; label: string; pts: number }>): RankedUserRow {
  return {
    id: user.id,
    full_name: user.full_name,
    score: user.total_score,
    is_admin: user.is_admin,
    breakdown: {
      exact_pts: user.tb.exact_pts,
      diff_pts: user.tb.diff_pts,
      winner_pts: user.tb.winner_pts,
      prediction_pts: user.tb.prediction_pts,
      round_bonuses: roundBonuses,
      referral_bonus: user.referral_bonus,
      score_adjustment: user.score_adjustment,
    },
  };
}

function toRoundRow(row: RoundRow): RankedUserRow {
  // winner_pts da rodada = pontos só-vencedor = total − exatos − saldo.
  const winnerPts = Math.max(0, row.points - row.exact_pts - row.diff_pts);
  return {
    id: row.user_id,
    full_name: row.full_name,
    score: row.points,
    is_admin: row.is_admin,
    is_winner: row.is_winner,
    round_bonus: row.bonus,
    breakdown: {
      exact_pts: row.exact_pts,
      diff_pts: row.diff_pts,
      winner_pts: winnerPts,
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

    const { matches: staticMatches } = await import('@/data/matches');

    const finalIds    = new Set(staticMatches.filter(m => m.stage === 'final').map(m => m.id));
    const semiIds     = new Set(staticMatches.filter(m => m.stage === 'semi-final').map(m => m.id));
    const quartersIds = new Set(staticMatches.filter(m => m.stage === 'quarter-final').map(m => m.id));
    const ro16Ids     = new Set(staticMatches.filter(m => m.stage === 'round-of-16').map(m => m.id));

    // ── Tiebreakers por usuário ──────────────────────────────────────────
    // Acertos contados pelo ponto-base (antes do multiplicador): cada placar
    // exato vale 5 e cada saldo vale 3 no desempate, independentemente do turbo.
    const tbMap = new Map<string, Tiebreakers>();
    for (const p of preds) {
      const t = tbMap.get(p.user_id) ?? { ...EMPTY_TB };
      const pts = p.points_earned;
      const base = p.base_points ?? 0;
      t.prediction_pts += pts;
      if (base === 5) t.exact_pts  += 5;
      if (base === 3) t.diff_pts   += 3;
      if (base === 1) t.winner_pts += 1;
      if (finalIds.has(p.match_id))    t.final_pts    += pts;
      if (semiIds.has(p.match_id))     t.semi_pts     += pts;
      if (quartersIds.has(p.match_id)) t.quarters_pts += pts;
      if (ro16Ids.has(p.match_id))     t.ro16_pts     += pts;
      tbMap.set(p.user_id, t);
    }

    // ── Classificação geral ─────────────────────────────────────────────
    ranking = profiles
      .map((pr) => ({
        id: pr.id,
        full_name: pr.full_name,
        total_score: pr.total_score ?? 0,
        is_admin: pr.is_admin ?? false,
        referral_bonus: pr.referral_bonus ?? 0,
        score_adjustment: pr.score_adjustment ?? 0,
        tb: tbMap.get(pr.id) ?? { ...EMPTY_TB },
      }))
      .sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        return compareTiebreakers(a.tb, b.tb);
      });

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

    roundRows = rScores
      .filter((r) => ROUND_ORDER.includes(r.round_key as RoundKey))
      .map((r) => ({
        user_id: r.user_id,
        round_key: r.round_key,
        points: r.points,
        exact_pts: r.exact_pts,
        diff_pts: r.diff_pts,
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

  // ── Agrupa round_rows por rodada ────────────────────────────────────
  const byRound = new Map<RoundKey, RoundRow[]>();
  for (const r of roundRows) {
    const key = r.round_key as RoundKey;
    const list = byRound.get(key) ?? [];
    list.push(r);
    byRound.set(key, list);
  }

  // Ordena os participantes de uma rodada: colocados (place asc), admin/sem
  // colocação por último (por pontos).
  const sortRound = (rows: RoundRow[]) =>
    [...rows].sort((a, b) => {
      const pa = a.place ?? Number.POSITIVE_INFINITY;
      const pb = b.place ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return b.points - a.points;
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
  const generalRows: RankedUserRow[] = ranking.map((u) =>
    toGeneralRow(u, roundBonusMap.get(u.id) ?? [])
  );

  // Opções do seletor de rodada: rodadas com dados + a rodada vigente.
  const roundOptions: RoundOption[] = ROUND_ORDER.filter(
    (key) => byRound.has(key) || key === vigenteKey
  ).map((key) => {
    const rows = byRound.get(key) ?? [];
    return {
      key,
      label: ROUND_LABELS[key],
      complete: rows[0]?.complete ?? false,
      endLabel: fmtEnd(key),
      bonusTop: ROUND_BONUS_POINTS,
      rows: sortRound(rows).map(toRoundRow),
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
          Classificação & Prêmios
        </h1>
        <p
          className="animate-fade-in"
          style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
        >
          Premiação para os cinco primeiros colocados ao final da Copa. Além
          disso, os <strong>5 primeiros de cada rodada</strong> ganham bônus
          (1º +50 · 2º +30 · 3º +20 · 4º +10 · 5º +5). Custos de frete não inclusos.
        </p>
        <div className="animate-fade-in" style={{ marginTop: 'var(--space-md)' }}>
          <Link href="/bolao" className="btn btn-gold btn-sm">
            <ArrowLeft size={15} /> Registrar palpites
          </Link>
        </div>
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
                  {allRows.map((r) => (
                    <div
                      key={r.user_id}
                      className={`champion-rank-row${r.is_winner ? ' is-winner' : ''}`}
                    >
                      <span className="champion-rank-pos">
                        {r.is_winner ? <Crown size={12} /> : r.place != null ? `${r.place}º` : '—'}
                      </span>
                      <span className="champion-rank-name">
                        {r.full_name ?? 'Participante'}
                        {r.is_admin && <span className="champion-rank-tag">fora de competição</span>}
                      </span>
                      <span className="champion-rank-pts">
                        {r.bonus > 0 && <span className="champion-rank-bonus">+{r.bonus}</span>}
                        {r.points} pts
                      </span>
                    </div>
                  ))}
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
