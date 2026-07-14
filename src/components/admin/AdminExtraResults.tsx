'use client';

import { useState, useTransition } from 'react';
import { ClipboardList } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { setMatchExtraActuals } from '@/app/admin/actions';
import { EXTRA_BET_MATCH_IDS, type FirstGoal } from '@/lib/bolao/extra-bets';
import './admin.css';

interface ManualActuals {
  yellowHome: number | null;
  yellowAway: number | null;
  redHome: number | null;
  redAway: number | null;
  firstGoal: FirstGoal | null;
}

/** Valores iniciais vindos de match_extra_results (só colunas manuais). */
export type InitialExtraActuals = Record<string, ManualActuals>;

function ExtraRow({
  matchId,
  initial,
}: {
  matchId: string;
  initial: ManualActuals;
}) {
  const [values, setValues] = useState<ManualActuals>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const match = allMatches.find((m) => m.id === matchId);
  if (!match) return null;
  const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
  const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;
  const homeName = home?.name ?? match.homeTeamPlaceholder ?? 'A definir';
  const awayName = away?.name ?? match.awayTeamPlaceholder ?? 'A definir';

  function setNum(field: keyof Omit<ManualActuals, 'firstGoal'>, raw: string) {
    setValues((v) => ({ ...v, [field]: raw === '' ? null : Number(raw) }));
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const res = await setMatchExtraActuals(matchId, values);
      setFeedback(res.ok ? 'Salvo e apurado ✓' : res.error ?? 'Erro ao salvar.');
    });
  }

  return (
    <div className="admin-match-row glass-card-static">
      <div className="admin-match-info">
        <div className="admin-match-teams">
          <strong>{homeName}</strong>
          <span className="admin-match-x">×</span>
          <strong>{awayName}</strong>
        </div>
        <div className="admin-extra-fields">
          <label>
            Amarelos {homeName}
            <input type="number" min={0} max={30} value={values.yellowHome ?? ''} disabled={pending}
              onChange={(e) => setNum('yellowHome', e.target.value)} />
          </label>
          <label>
            Amarelos {awayName}
            <input type="number" min={0} max={30} value={values.yellowAway ?? ''} disabled={pending}
              onChange={(e) => setNum('yellowAway', e.target.value)} />
          </label>
          <label>
            Vermelhos {homeName}
            <input type="number" min={0} max={30} value={values.redHome ?? ''} disabled={pending}
              onChange={(e) => setNum('redHome', e.target.value)} />
          </label>
          <label>
            Vermelhos {awayName}
            <input type="number" min={0} max={30} value={values.redAway ?? ''} disabled={pending}
              onChange={(e) => setNum('redAway', e.target.value)} />
          </label>
          <label>
            1º gol
            <select value={values.firstGoal ?? ''} disabled={pending}
              onChange={(e) => setValues((v) => ({ ...v, firstGoal: (e.target.value || null) as FirstGoal | null }))}>
              <option value="">—</option>
              <option value="home">{homeName}</option>
              <option value="away">{awayName}</option>
              <option value="none">Nenhum gol</option>
            </select>
          </label>
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar e apurar'}
          </button>
        </div>
        {feedback && <span className="admin-match-date">{feedback}</span>}
      </div>
    </div>
  );
}

/**
 * Entrada manual dos resultados que a API não fornece (cartões e 1º gol),
 * para os jogos com palpites extras (semis, 3º lugar e final). Salvar
 * dispara a apuração (applyScoring) na hora.
 */
export function AdminExtraResults({ initial }: { initial: InitialExtraActuals }) {
  return (
    <section style={{ marginTop: 'var(--space-2xl)' }}>
      <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-xs)' }}>
        <ClipboardList size={18} style={{ color: 'var(--gold)' }} />
        Resultados extras (cartões e 1º gol)
      </h2>
      <p className="admin-empty" style={{ padding: 0, marginBottom: 'var(--space-md)' }}>
        Preencha após o apito final — placares parciais, prorrogação e pênaltis
        chegam sozinhos pelo sync. Salvar já apura os pontos dos palpites extras.
      </p>
      <div className="admin-match-grid">
        {EXTRA_BET_MATCH_IDS.map((id) => (
          <ExtraRow key={id} matchId={id} initial={initial[id] ?? {
            yellowHome: null, yellowAway: null, redHome: null, redAway: null, firstGoal: null,
          }} />
        ))}
      </div>
    </section>
  );
}
