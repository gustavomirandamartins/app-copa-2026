import Link from 'next/link';
import { Trophy, Medal, Award, Info, ArrowLeft, ChevronDown, Crown, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ROUND_ORDER, ROUND_LABELS, ROUND_BONUS_POINTS, type RoundKey } from '@/lib/bolao/rounds';
import './ranking.css';

export const revalidate = 0;

interface RankedUser {
  full_name: string | null;
  total_score: number;
}

interface RoundScoreRow {
  round_key: string;
  full_name: string | null;
  points: number;
  complete: boolean;
  is_winner: boolean;
}

// O admin aparece na classificação pela ordem dos pontos, mas fora de
// competição: não ocupa colocação (a posição segue para o próximo) e não
// recebe o destaque dos 5 primeiros.
const ADMIN_NAME = 'Gustavo Martins';
const normalizeName = (s: string | null) => (s ?? '').trim().toLowerCase();
const isAdminName = (s: string | null) => normalizeName(s) === normalizeName(ADMIN_NAME);

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
  { full_name: 'Ana Souza', total_score: 87 },
  { full_name: 'Bruno Lima', total_score: 81 },
  { full_name: 'Carla Mendes', total_score: 76 },
  { full_name: 'Diego Alves', total_score: 64 },
  { full_name: 'Elaine Costa', total_score: 59 },
  { full_name: 'Felipe Rocha', total_score: 48 },
];

export default async function RankingPage() {
  const configured = isSupabaseConfigured();
  let ranking: RankedUser[] = [];
  let roundScores: RoundScoreRow[] = [];

  if (configured) {
    const supabase = await createClient();
    // Views públicas: já filtram agreed_to_ranking e não expõem dados sensíveis.
    const [{ data: rankData }, { data: roundData }] = await Promise.all([
      supabase
        .from('public_ranking')
        .select('full_name, total_score')
        .order('total_score', { ascending: false }),
      supabase
        .from('public_round_scores')
        .select('round_key, full_name, points, complete, is_winner'),
    ]);
    ranking = (rankData as RankedUser[]) ?? [];
    roundScores = (roundData as RoundScoreRow[]) ?? [];
  } else {
    ranking = DEMO_RANKING;
  }

  // ── Agrupa pontos por rodada ────────────────────────────────────────
  const byRound = new Map<RoundKey, RoundScoreRow[]>();
  for (const r of roundScores) {
    const key = r.round_key as RoundKey;
    if (!ROUND_ORDER.includes(key)) continue;
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
    ? [...(byRound.get(currentRoundKey) ?? [])].sort((a, b) => b.points - a.points)
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
            let place = 0; // contador de colocação (ignora o admin)
            return ranking.map((user, i) => {
              const isAdmin = isAdminName(user.full_name);
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
