import Link from 'next/link';
import { Trophy, Medal, Award, Info, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import './ranking.css';

interface RankedUser {
  full_name: string | null;
  total_score: number;
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

  if (configured) {
    const supabase = await createClient();
    // View pública: já filtra agreed_to_ranking e não expõe colunas sensíveis.
    const { data } = await supabase
      .from('public_ranking')
      .select('full_name, total_score')
      .order('total_score', { ascending: false });
    ranking = (data as RankedUser[]) ?? [];
  } else {
    ranking = DEMO_RANKING;
  }

  return (
    <div className="container">
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: 'var(--space-sm)' }}>
          <Trophy
            size={28}
            style={{ color: 'var(--gold)', verticalAlign: 'middle', marginRight: 8 }}
          />
          Ranking & Prêmios
        </h1>
        <p
          className="animate-fade-in"
          style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
        >
          Premiação MinduBier 10 Anos para os três primeiros colocados.
        </p>
        <div className="animate-fade-in" style={{ marginTop: 'var(--space-md)' }}>
          <Link href="/bolao" className="btn btn-gold btn-sm">
            <ArrowLeft size={15} /> Registrar palpites
          </Link>
        </div>
      </section>

      {/* Prêmios */}
      <div className="prizes-grid animate-slide-up">
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
            o ranking real dos participantes.
          </p>
        </div>
      )}

      {/* Classificação */}
      <h3 style={{ marginBottom: 'var(--space-md)' }}>Classificação</h3>
      {ranking.length === 0 ? (
        <div className="glass-card-static" style={{ padding: 'var(--space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Ainda não há participantes no ranking.
          </p>
        </div>
      ) : (
        <div className="ranking-list">
          {ranking.map((user, i) => (
            <div
              key={`${user.full_name}-${i}`}
              className={`glass-card-static ranking-row ${i < 3 ? 'podium' : ''}`}
            >
              <div className="ranking-pos">{i + 1}º</div>
              <div className="ranking-name">
                {user.full_name ?? 'Participante'}
              </div>
              <div className="ranking-score">
                {user.total_score}
                <small>pts</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
