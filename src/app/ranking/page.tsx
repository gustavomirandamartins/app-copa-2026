import Link from 'next/link';
import { Trophy, Medal, Award, Info, ArrowLeft, ChevronDown, Crown, Zap, BookOpen } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROUND_ORDER, ROUND_LABELS, ROUND_BONUS_POINTS, ROUND_MATCH_IDS, type RoundKey } from '@/lib/bolao/rounds';
import './ranking.css';

export const revalidate = 0;

// O admin aparece na classificação pela ordem dos pontos, mas fora de
// competição: não ocupa colocação (a posição segue para o próximo) e não
// recebe o destaque dos 5 primeiros.
const ADMIN_NAME = 'Gustavo Martins';
const normalizeName = (s: string | null) => (s ?? '').trim().toLowerCase();
const isAdminName = (s: string | null) => normalizeName(s) === normalizeName(ADMIN_NAME);

interface Tiebreakers {
  prediction_pts: number; // 1: pontos de palpite (sem bônus)
  exact_pts: number;      // 2: acertos de placar exato (5 pts)
  diff_pts: number;       // 3: acertos de vencedor + diferença (3 pts)
  final_pts: number;      // 4: pontos na final
  semi_pts: number;       // 5: pontos nas semifinais
  quarters_pts: number;   // 6: pontos nas quartas
  ro16_pts: number;       // 7: pontos nas oitavas
}

interface RankedUser {
  id: string;
  full_name: string | null;
  total_score: number;
  is_admin: boolean;
  tb: Tiebreakers;
}

interface RoundRow {
  user_id: string;
  full_name: string | null;
  round_key: string;
  points: number;
  complete: boolean;
  is_winner: boolean;
  tb: Pick<Tiebreakers, 'prediction_pts' | 'exact_pts' | 'diff_pts'>;
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
      `+${ROUND_BONUS_POINTS} pontos ao 1º de cada rodada`,
      'Grupos: 3 rodadas',
      'Mata-mata: 16-avos, oitavas, quartas e semis',
    ],
  },
];

// Usado apenas no modo demonstração (sem Supabase configurado).
const DEMO_RANKING: RankedUser[] = [
  { id: '1', full_name: 'Ana Souza',     total_score: 87, is_admin: false, tb: { prediction_pts: 87, exact_pts: 20, diff_pts: 15, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 } },
  { id: '2', full_name: 'Bruno Lima',    total_score: 81, is_admin: false, tb: { prediction_pts: 81, exact_pts: 15, diff_pts: 18, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 } },
  { id: '3', full_name: 'Carla Mendes',  total_score: 76, is_admin: false, tb: { prediction_pts: 71, exact_pts: 10, diff_pts: 21, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 } },
  { id: '4', full_name: 'Diego Alves',   total_score: 64, is_admin: false, tb: { prediction_pts: 64, exact_pts: 10, diff_pts: 12, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 } },
  { id: '5', full_name: 'Elaine Costa',  total_score: 59, is_admin: false, tb: { prediction_pts: 54, exact_pts:  5, diff_pts:  9, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 } },
  { id: '6', full_name: 'Felipe Rocha',  total_score: 48, is_admin: false, tb: { prediction_pts: 48, exact_pts:  0, diff_pts:  6, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 } },
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

export default async function RankingPage() {
  const configured = isSupabaseConfigured();
  let ranking: RankedUser[] = [];
  let roundRows: RoundRow[] = [];

  if (configured) {
    const admin = createAdminClient();

    // ── Dados base ──────────────────────────────────────────────────────
    const [
      { data: profilesData },
      { data: predsData },
      { data: roundScoresData },
    ] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, total_score, is_admin')
        .eq('agreed_to_ranking', true),
      admin
        .from('predictions')
        .select('user_id, match_id, points_earned')
        .not('points_earned', 'is', null),
      admin
        .from('round_scores')
        .select('user_id, round_key, points, complete, is_winner'),
    ]);

    const profiles = (profilesData ?? []) as { id: string; full_name: string | null; total_score: number; is_admin: boolean }[];
    const preds    = (predsData    ?? []) as { user_id: string; match_id: string; points_earned: number }[];
    const rScores  = (roundScoresData ?? []) as { user_id: string; round_key: string; points: number; complete: boolean; is_winner: boolean }[];

    // Mapa estático de stage por match_id (vem dos dados locais, sem query extra)
    const { matches: staticMatches } = await import('@/data/matches');
    const matchStage = new Map<string, string>(staticMatches.map((m) => [m.id, m.stage]));

    // Match IDs de cada fase eliminatória (para tiebreakers 4-7)
    const finalIds       = new Set(ROUND_MATCH_IDS['semi-final'].length > 0 ? ['final-match'] : staticMatches.filter(m => m.stage === 'final').map(m => m.id));
    const semiIds        = new Set(staticMatches.filter(m => m.stage === 'semi-final').map(m => m.id));
    const quartersIds    = new Set(staticMatches.filter(m => m.stage === 'quarter-final').map(m => m.id));
    const ro16Ids        = new Set(staticMatches.filter(m => m.stage === 'round-of-16').map(m => m.id));

    // ── Tiebreakers por usuário ──────────────────────────────────────────
    const tbMap = new Map<string, Tiebreakers>();
    for (const p of preds) {
      const t = tbMap.get(p.user_id) ?? { prediction_pts: 0, exact_pts: 0, diff_pts: 0, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 };
      const pts = p.points_earned;
      t.prediction_pts += pts;
      if (pts === 5) t.exact_pts   += 5;
      if (pts === 3) t.diff_pts    += 3;
      if (finalIds.has(p.match_id))    t.final_pts    += pts;
      if (semiIds.has(p.match_id))     t.semi_pts     += pts;
      if (quartersIds.has(p.match_id)) t.quarters_pts += pts;
      if (ro16Ids.has(p.match_id))     t.ro16_pts     += pts;
      tbMap.set(p.user_id, t);
    }

    // ── Classificação geral (ordena com critérios de desempate) ─────────
    ranking = profiles
      .map((pr) => ({
        id: pr.id,
        full_name: pr.full_name,
        total_score: pr.total_score ?? 0,
        is_admin: pr.is_admin ?? false,
        tb: tbMap.get(pr.id) ?? { prediction_pts: 0, exact_pts: 0, diff_pts: 0, final_pts: 0, semi_pts: 0, quarters_pts: 0, ro16_pts: 0 },
      }))
      .sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        return compareTiebreakers(a.tb, b.tb);
      });

    // ── Tiebreakers por rodada (critérios 1-3 dentro da rodada) ─────────
    const roundPredMap = new Map<string, { exact_pts: number; diff_pts: number }>();
    // key = `${userId}:${roundKey}`
    for (const p of preds) {
      for (const [roundKey, ids] of Object.entries(ROUND_MATCH_IDS) as [RoundKey, string[]][]) {
        if (!ids.includes(p.match_id)) continue;
        const key = `${p.user_id}:${roundKey}`;
        const cur = roundPredMap.get(key) ?? { exact_pts: 0, diff_pts: 0 };
        if (p.points_earned === 5) cur.exact_pts += 5;
        if (p.points_earned === 3) cur.diff_pts  += 3;
        roundPredMap.set(key, cur);
      }
    }

    // Mapeia user_id → full_name via profiles
    const nameMap = new Map<string, string | null>(profiles.map((p) => [p.id, p.full_name]));

    roundRows = rScores
      .filter((r) => ROUND_ORDER.includes(r.round_key as RoundKey))
      .map((r) => {
        const rpKey = `${r.user_id}:${r.round_key}`;
        const rp = roundPredMap.get(rpKey) ?? { exact_pts: 0, diff_pts: 0 };
        return {
          ...r,
          full_name: nameMap.get(r.user_id) ?? null,
          tb: {
            prediction_pts: r.points, // pontos da rodada já são só de palpites
            exact_pts: rp.exact_pts,
            diff_pts:  rp.diff_pts,
          },
        };
      });
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

  // Campeões: rodadas encerradas com vencedor(es).
  const champions = ROUND_ORDER.flatMap((key) => {
    const rows = byRound.get(key);
    if (!rows || !rows[0]?.complete) return [];
    const winners = rows.filter((r) => r.is_winner);
    if (winners.length === 0) return [];
    return [{ key, winners, points: winners[0].points }];
  });

  // Rodada atual = última rodada (na ordem) que já tem pontuação registrada.
  let currentRoundKey: RoundKey | null = null;
  for (const key of ROUND_ORDER) {
    if (byRound.has(key)) currentRoundKey = key;
  }
  const currentRoundRows = currentRoundKey
    ? [...(byRound.get(currentRoundKey) ?? [])].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.tb.exact_pts !== a.tb.exact_pts) return b.tb.exact_pts - a.tb.exact_pts;
        if (b.tb.diff_pts  !== a.tb.diff_pts)  return b.tb.diff_pts  - a.tb.diff_pts;
        return 0;
      })
    : [];
  const currentRoundComplete = currentRoundRows[0]?.complete ?? false;

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
          disso, o vencedor de cada rodada ganha <strong>+{ROUND_BONUS_POINTS} pontos
          de bônus</strong>. Custos de frete não inclusos.
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
            Ver premiações — geral + bônus por rodada
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
            Regras — pontuação, classificação e desempate
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
                <span className="rules-desc">Acertou o <strong>placar exato</strong></span>
              </div>
              <div className="rules-score-row rules-score-diff">
                <span className="rules-pts">3 pts</span>
                <span className="rules-desc">Acertou o <strong>vencedor</strong> e a <strong>diferença de gols</strong></span>
              </div>
              <div className="rules-score-row rules-score-winner">
                <span className="rules-pts">1 pt</span>
                <span className="rules-desc">Acertou apenas o <strong>vencedor</strong></span>
              </div>
              <div className="rules-score-row rules-score-miss">
                <span className="rules-pts">0 pts</span>
                <span className="rules-desc">Errou o vencedor ou não preencheu</span>
              </div>
            </div>
            <p className="rules-note">
              Partidas com <strong>multiplicador de bônus</strong> (⚡) duplicam os pontos obtidos naquele jogo.
            </p>
          </div>

          {/* Bônus extras */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Bônus</h4>
            <ul className="rules-list">
              <li>
                <strong>Bônus de rodada (+{ROUND_BONUS_POINTS} pts):</strong> o 1º colocado de cada rodada ao fim dela recebe {ROUND_BONUS_POINTS} pontos extras na classificação geral.
              </li>
              <li>
                <strong>Bônus de indicação (+5 pts):</strong> cada amigo indicado que entrar no Bolão e tiver o cadastro aprovado vale +5 pts.
              </li>
            </ul>
          </div>

          {/* Classificação geral */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Classificação geral</h4>
            <ul className="rules-list">
              <li>Soma de todos os pontos de palpite ao longo de toda a Copa.</li>
              <li>Inclui os bônus de rodada e de indicação.</li>
              <li>Os <strong>5 primeiros colocados</strong> ao final da Copa recebem premiação física.</li>
            </ul>
          </div>

          {/* Classificação por rodada */}
          <div className="glass-card-static rules-section">
            <h4 className="rules-section-title">Classificação por rodada</h4>
            <ul className="rules-list">
              <li>Soma dos pontos obtidos apenas nos palpites das partidas daquela rodada.</li>
              <li><strong>Não inclui</strong> bônus de rodada nem de indicação.</li>
              <li>O 1º colocado ao fim da rodada recebe <strong>+{ROUND_BONUS_POINTS} pts de bônus</strong> na classificação geral.</li>
              <li>Rodadas: 3 rodadas na fase de grupos + 16-avos, oitavas, quartas e semifinais.</li>
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

      {/* Campeões de rodada (acima da classificação geral) */}
      {champions.length > 0 && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>
            <Crown size={18} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 6 }} />
            Campeões de rodada
          </h3>
          <div className="champions-grid">
            {champions.map(({ key, winners, points }) => (
              <div key={key} className="glass-card-static champion-card">
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
            ))}
          </div>
        </section>
      )}

      {/* Classificação geral */}
      <h3 style={{ marginBottom: 'var(--space-md)' }}>Classificação geral</h3>
      {ranking.length === 0 ? (
        <div className="glass-card-static" style={{ padding: 'var(--space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Ainda não há participantes na classificação.
          </p>
        </div>
      ) : (
        <div className="ranking-list">
          {(() => {
            let place = 0;
            return ranking.map((user, i) => {
              const isAdmin = isAdminName(user.full_name) || user.is_admin;
              let displayPlace: number | null = null;
              if (!isAdmin) {
                place += 1;
                displayPlace = place;
              }
              const top5 = displayPlace !== null && displayPlace <= 5;
              return (
                <div
                  key={`${user.full_name}-${i}`}
                  className={`glass-card-static ranking-row ${top5 ? 'top5' : ''} ${
                    isAdmin ? 'admin' : ''
                  }`}
                >
                  <div className="ranking-pos">
                    {displayPlace !== null ? `${displayPlace}º` : '—'}
                  </div>
                  <div className="ranking-name">
                    {user.full_name ?? 'Participante'}
                    {isAdmin && (
                      <span className="ranking-tag">fora de competição</span>
                    )}
                  </div>
                  <div className="ranking-score">
                    {user.total_score}
                    <small>pts</small>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Classificação da rodada (abaixo da geral) */}
      {currentRoundKey && currentRoundRows.length > 0 && (
        <section style={{ marginTop: 'var(--space-2xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-xs)' }}>
            <Zap size={18} style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 6 }} />
            Classificação · {ROUND_LABELS[currentRoundKey]}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            {currentRoundComplete
              ? `Rodada encerrada — o 1º levou +${ROUND_BONUS_POINTS} pontos de bônus.`
              : `Rodada em andamento — o 1º ao fim leva +${ROUND_BONUS_POINTS} pontos de bônus.`}
          </p>
          <div className="ranking-list">
            {(() => {
              let place = 0;
              return currentRoundRows.map((row, i) => {
                const isAdmin = isAdminName(row.full_name);
                let displayPlace: number | null = null;
                if (!isAdmin) {
                  place += 1;
                  displayPlace = place;
                }
                return (
                  <div
                    key={`${row.full_name}-${i}`}
                    className={`glass-card-static ranking-row round-row ${
                      row.is_winner ? 'top5' : ''
                    } ${isAdmin ? 'admin' : ''}`}
                  >
                    <div className="ranking-pos">
                      {row.is_winner ? (
                        <Crown size={18} style={{ color: 'var(--gold)' }} />
                      ) : displayPlace !== null ? (
                        `${displayPlace}º`
                      ) : (
                        '—'
                      )}
                    </div>
                    <div className="ranking-name">
                      {row.full_name ?? 'Participante'}
                      {isAdmin && <span className="ranking-tag">fora de competição</span>}
                      {row.is_winner && <span className="ranking-tag tag-bonus">+{ROUND_BONUS_POINTS} bônus</span>}
                    </div>
                    <div className="ranking-score">
                      {row.points}
                      <small>pts</small>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>
      )}
    </div>
  );
}
