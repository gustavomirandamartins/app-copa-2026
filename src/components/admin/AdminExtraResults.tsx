'use client';

import { useState, useTransition } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { matches as allMatches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { setMatchExtraActuals } from '@/app/admin/actions';
import { EXTRA_BET_MATCH_IDS, type FirstGoal } from '@/lib/bolao/extra-bets';
import type { LiveTeamsByMatch } from './AdminMatchList';
import './admin.css';

interface ManualActuals {
  yellowHome: number | null;
  yellowAway: number | null;
  redHome: number | null;
  redAway: number | null;
  firstGoal: FirstGoal | null;
  shotsHome: number | null;
  shotsAway: number | null;
  offsideHome: number | null;
  offsideAway: number | null;
  cornerHome: number | null;
  cornerAway: number | null;
  foulsHome: number | null;
  foulsAway: number | null;
}

/** Valores iniciais vindos de match_extra_results (só colunas manuais). */
export type InitialExtraActuals = Record<string, ManualActuals>;

/** Parciais sincronizadas pela football-data (colunas de API, só leitura). */
export interface SyncedExtraData {
  ht_home: number | null;
  ht_away: number | null;
  rt_home: number | null;
  rt_away: number | null;
  et_home: number | null;
  et_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null;
  updated_at: string | null;
}

export type SyncedExtraDataByMatch = Record<string, SyncedExtraData>;

const DURATION_LABEL: Record<string, string> = {
  REGULAR: 'Decidido no tempo normal',
  EXTRA_TIME: 'Foi à prorrogação',
  PENALTY_SHOOTOUT: 'Foi aos pênaltis',
};

function fmtPair(a: number | null, b: number | null): string {
  return a == null || b == null ? '—' : `${a} × ${b}`;
}

/** Faixa de leitura do que a football-data já sincronizou — pura conferência,
 *  nenhum campo editável aqui (esses vêm do sync, não do admin). */
function SyncedDataStrip({ data }: { data: SyncedExtraData | undefined }) {
  if (!data || data.duration == null) {
    return (
      <div className="admin-synced-strip admin-synced-empty">
        <RefreshCw size={12} /> Ainda sem dados sincronizados da API.
      </div>
    );
  }
  const h2Home = data.rt_home != null && data.ht_home != null ? data.rt_home - data.ht_home : null;
  const h2Away = data.rt_away != null && data.ht_away != null ? data.rt_away - data.ht_away : null;
  const hadExtraTime = data.duration === 'EXTRA_TIME' || data.duration === 'PENALTY_SHOOTOUT';
  const hadPenalties = data.duration === 'PENALTY_SHOOTOUT';

  return (
    <div className="admin-synced-strip">
      <div className="admin-synced-title">
        <RefreshCw size={12} /> Sincronizado da API — {DURATION_LABEL[data.duration] ?? data.duration}
      </div>
      <div className="admin-synced-grid">
        <span>1º tempo: <strong>{fmtPair(data.ht_home, data.ht_away)}</strong></span>
        <span>2º tempo: <strong>{fmtPair(h2Home, h2Away)}</strong></span>
        <span>Prorrogação: <strong>{hadExtraTime ? fmtPair(data.et_home, data.et_away) : 'não ocorreu'}</strong></span>
        <span>Pênaltis: <strong>{hadPenalties ? fmtPair(data.pen_home, data.pen_away) : 'não ocorreu'}</strong></span>
      </div>
      {data.updated_at && (
        <span className="admin-synced-updated">
          Última atualização: {new Date(data.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
        </span>
      )}
    </div>
  );
}

function ExtraRow({
  matchId,
  initial,
  liveTeams,
  synced,
}: {
  matchId: string;
  initial: ManualActuals;
  liveTeams?: { homeTeamId: string | null; awayTeamId: string | null };
  synced?: SyncedExtraData;
}) {
  const [values, setValues] = useState<ManualActuals>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const match = allMatches.find((m) => m.id === matchId);
  if (!match) return null;
  // Times reais do mata-mata vêm do sync (tabela matches) — o calendário
  // estático só sabe "Vencedor do Jogo N" até o jogo anterior terminar.
  const homeTeamId = liveTeams?.homeTeamId ?? match.homeTeamId;
  const awayTeamId = liveTeams?.awayTeamId ?? match.awayTeamId;
  const home = homeTeamId ? getTeamById(homeTeamId) : null;
  const away = awayTeamId ? getTeamById(awayTeamId) : null;
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

        <SyncedDataStrip data={synced} />

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
            Chutes a gol {homeName}
            <input type="number" min={0} max={30} value={values.shotsHome ?? ''} disabled={pending}
              onChange={(e) => setNum('shotsHome', e.target.value)} />
          </label>
          <label>
            Chutes a gol {awayName}
            <input type="number" min={0} max={30} value={values.shotsAway ?? ''} disabled={pending}
              onChange={(e) => setNum('shotsAway', e.target.value)} />
          </label>
          <label>
            Impedimentos {homeName}
            <input type="number" min={0} max={30} value={values.offsideHome ?? ''} disabled={pending}
              onChange={(e) => setNum('offsideHome', e.target.value)} />
          </label>
          <label>
            Impedimentos {awayName}
            <input type="number" min={0} max={30} value={values.offsideAway ?? ''} disabled={pending}
              onChange={(e) => setNum('offsideAway', e.target.value)} />
          </label>
          <label>
            Escanteios {homeName}
            <input type="number" min={0} max={30} value={values.cornerHome ?? ''} disabled={pending}
              onChange={(e) => setNum('cornerHome', e.target.value)} />
          </label>
          <label>
            Escanteios {awayName}
            <input type="number" min={0} max={30} value={values.cornerAway ?? ''} disabled={pending}
              onChange={(e) => setNum('cornerAway', e.target.value)} />
          </label>
          <label>
            Faltas {homeName}
            <input type="number" min={0} max={30} value={values.foulsHome ?? ''} disabled={pending}
              onChange={(e) => setNum('foulsHome', e.target.value)} />
          </label>
          <label>
            Faltas {awayName}
            <input type="number" min={0} max={30} value={values.foulsAway ?? ''} disabled={pending}
              onChange={(e) => setNum('foulsAway', e.target.value)} />
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
 * Entrada manual dos resultados que a API não fornece (cartões, chutes a
 * gol, impedimentos, escanteios e 1º gol), para os jogos com palpites
 * extras (semis, 3º lugar e final). Mostra também, em cada jogo, uma faixa
 * só de leitura com o que a football-data já sincronizou (placares parciais,
 * prorrogação e pênaltis) — pra conferência antes de digitar o resto.
 * Salvar dispara a apuração (applyScoring) na hora.
 */
export function AdminExtraResults({
  initial,
  liveTeamsByMatch,
  syncedByMatch,
}: {
  initial: InitialExtraActuals;
  liveTeamsByMatch?: LiveTeamsByMatch;
  syncedByMatch?: SyncedExtraDataByMatch;
}) {
  return (
    <section style={{ marginTop: 'var(--space-2xl)' }}>
      <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-xs)' }}>
        <ClipboardList size={18} style={{ color: 'var(--gold)' }} />
        Resultados extras
      </h2>
      <p className="admin-empty" style={{ padding: 0, marginBottom: 'var(--space-md)' }}>
        Placares parciais, prorrogação e pênaltis chegam sozinhos pelo sync —
        a faixa &quot;Sincronizado da API&quot; mostra o que já veio, pra
        conferência. Cartões, chutes a gol, impedimentos, escanteios e o 1º
        gol são manuais (a API não fornece). Salvar já apura os pontos dos
        palpites extras.
      </p>
      <div className="admin-match-grid">
        {EXTRA_BET_MATCH_IDS.map((id) => (
          <ExtraRow
            key={id}
            matchId={id}
            initial={initial[id] ?? {
              yellowHome: null, yellowAway: null, redHome: null, redAway: null, firstGoal: null,
              shotsHome: null, shotsAway: null, offsideHome: null, offsideAway: null,
              cornerHome: null, cornerAway: null, foulsHome: null, foulsAway: null,
            }}
            liveTeams={liveTeamsByMatch?.[id]}
            synced={syncedByMatch?.[id]}
          />
        ))}
      </div>
    </section>
  );
}
