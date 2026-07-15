'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { getTeamById } from '@/data/teams';
// Estilos próprios (.extra-bets*) e base (.bolao-score-input) vivem no
// bolao.css — importado aqui para o painel funcionar também fora do /bolao
// (ex.: dashboard da página inicial).
import './bolao.css';
import {
  EXTRA_COUNTING_MATCH_IDS,
  EXTRA_POINTS_PER_CATEGORY,
  type ExtraPredictionInput,
  type FirstGoal,
} from '@/lib/bolao/extra-bets';

/** Valor de um palpite extra no estado do cliente (sem match_id). */
export type ExtraValue = Omit<ExtraPredictionInput, 'match_id'>;

export const EMPTY_EXTRA_VALUE: ExtraValue = {
  ht_home: null, ht_away: null,
  h2_home: null, h2_away: null,
  et_home: null, et_away: null,
  pen_home: null, pen_away: null,
  yellow_home: null, yellow_away: null,
  red_home: null, red_away: null,
  first_goal: null,
  shots_home: null, shots_away: null,
  offside_home: null, offside_away: null,
  corner_home: null, corner_away: null,
  fouls_home: null, fouls_away: null,
};

type NumericField = keyof Omit<ExtraValue, 'first_goal'>;

/** true quando ao menos um campo do palpite extra foi preenchido. */
export function hasAnyExtraValue(v: ExtraValue): boolean {
  return Object.values(v).some((x) => x != null);
}

function ScorePair({
  label,
  hint,
  homeField,
  awayField,
  value,
  locked,
  onChange,
}: {
  label: string;
  hint?: string;
  homeField: NumericField;
  awayField: NumericField;
  value: ExtraValue;
  locked: boolean;
  onChange: (field: NumericField, raw: string) => void;
}) {
  return (
    <div className="extra-bet-row">
      <span className="extra-bet-label">
        {label}
        {hint && <em className="extra-bet-hint">{hint}</em>}
      </span>
      <div className="extra-bet-inputs">
        <input
          type="number" min={0} max={20} inputMode="numeric"
          className="bolao-score-input"
          aria-label={`${label} — mandante`}
          disabled={locked}
          value={value[homeField] ?? ''}
          onChange={(e) => onChange(homeField, e.target.value)}
        />
        <span className="bolao-x">×</span>
        <input
          type="number" min={0} max={20} inputMode="numeric"
          className="bolao-score-input"
          aria-label={`${label} — visitante`}
          disabled={locked}
          value={value[awayField] ?? ''}
          onChange={(e) => onChange(awayField, e.target.value)}
        />
      </div>
    </div>
  );
}

/** Palpite avulso de um número só (cartões: cada campo vale pontos sozinho). */
function SingleField({
  label,
  field,
  value,
  locked,
  onChange,
}: {
  label: string;
  field: NumericField;
  value: ExtraValue;
  locked: boolean;
  onChange: (field: NumericField, raw: string) => void;
}) {
  return (
    <div className="extra-bet-row">
      <span className="extra-bet-label">{label}</span>
      <div className="extra-bet-inputs">
        <input
          type="number" min={0} max={20} inputMode="numeric"
          className="bolao-score-input"
          aria-label={label}
          disabled={locked}
          value={value[field] ?? ''}
          onChange={(e) => onChange(field, e.target.value)}
        />
      </div>
    </div>
  );
}

/**
 * Painel de palpites extras — só nos jogos habilitados (semis = teste sem
 * pontos; 3º lugar e final = valendo). Toggle próprio, independente do
 * expander de probabilidades do card.
 */
export function ExtraBetsPanel({
  matchId,
  homeTeamId,
  awayTeamId,
  multiplier,
  locked,
  finished,
  value,
  pointsEarned,
  onChange,
}: {
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  multiplier: number;
  locked: boolean;
  finished: boolean;
  value: ExtraValue;
  /** points_earned apurado (pós-jogo); null antes da apuração. */
  pointsEarned: number | null;
  onChange: (matchId: string, next: ExtraValue) => void;
}) {
  const [open, setOpen] = useState(false);

  const counting = EXTRA_COUNTING_MATCH_IDS.includes(matchId);
  const home = homeTeamId ? getTeamById(homeTeamId) : null;
  const away = awayTeamId ? getTeamById(awayTeamId) : null;
  if (!home || !away) return null;

  const maxPoints = 17 * EXTRA_POINTS_PER_CATEGORY * multiplier;

  function setNumeric(field: NumericField, raw: string) {
    const parsed = raw === '' ? null : Number(raw);
    onChange(matchId, { ...value, [field]: parsed });
  }

  return (
    <div className="extra-bets">
      <button
        type="button"
        className={`extra-bets-toggle${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Sparkles size={13} />
        <span>Palpites extras</span>
        <span className={`extra-bets-badge ${counting ? 'counting' : 'trial'}`}>
          {counting ? `Vale até ${maxPoints} pts` : 'Rodada de teste — não vale pontos'}
        </span>
        <ChevronDown size={14} className="extra-bets-chevron" />
      </button>

      {open && (
        <div className="extra-bets-body">
          {finished && pointsEarned != null && (
            <p className="extra-bets-result">
              {counting
                ? `Extras: +${pointsEarned} pts`
                : `Você teria feito +${pointsEarned} pts (rodada de teste)`}
            </p>
          )}

          <ScorePair label="Placar do 1º tempo" homeField="ht_home" awayField="ht_away" value={value} locked={locked} onChange={setNumeric} />
          <ScorePair label="Placar do 2º tempo" hint="só os gols do 2º tempo" homeField="h2_home" awayField="h2_away" value={value} locked={locked} onChange={setNumeric} />
          <ScorePair label="Prorrogação" hint="caso ocorra — gols só da prorrogação" homeField="et_home" awayField="et_away" value={value} locked={locked} onChange={setNumeric} />
          <ScorePair label="Pênaltis" hint="caso ocorra — placar da disputa" homeField="pen_home" awayField="pen_away" value={value} locked={locked} onChange={setNumeric} />
          {/* Cartões: 4 palpites INDEPENDENTES (3 pts cada), um campo por
              seleção — não é um "placar" casado como os pares acima. */}
          <SingleField label={`Cartões amarelos — ${home.name}`} field="yellow_home" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Cartões amarelos — ${away.name}`} field="yellow_away" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Cartões vermelhos — ${home.name}`} field="red_home" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Cartões vermelhos — ${away.name}`} field="red_away" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Chutes a gol — ${home.name}`} field="shots_home" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Chutes a gol — ${away.name}`} field="shots_away" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Impedimentos — ${home.name}`} field="offside_home" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Impedimentos — ${away.name}`} field="offside_away" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Escanteios — ${home.name}`} field="corner_home" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Escanteios — ${away.name}`} field="corner_away" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Faltas — ${home.name}`} field="fouls_home" value={value} locked={locked} onChange={setNumeric} />
          <SingleField label={`Faltas — ${away.name}`} field="fouls_away" value={value} locked={locked} onChange={setNumeric} />

          <div className="extra-bet-row">
            <span className="extra-bet-label">Quem faz o 1º gol?</span>
            <select
              className="bolao-score-input extra-bet-select"
              disabled={locked}
              value={value.first_goal ?? ''}
              onChange={(e) =>
                onChange(matchId, { ...value, first_goal: (e.target.value || null) as FirstGoal | null })
              }
            >
              <option value="">Selecione...</option>
              <option value="home">{home.name}</option>
              <option value="away">{away.name}</option>
              <option value="none">Nenhum gol (0×0 até os pênaltis)</option>
            </select>
          </div>

          <p className="extra-bets-footnote">
            Acerto exato em cada item vale {EXTRA_POINTS_PER_CATEGORY} pts
            {multiplier > 1 ? ` (×${multiplier} turbinado)` : ''}. Prorrogação e
            pênaltis são anulados se não ocorrerem.
          </p>
        </div>
      )}
    </div>
  );
}
