'use client';

import { useState, useTransition } from 'react';
import { Shuffle, CheckCircle, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { recordTiebreakDraw, clearTiebreakDraw } from '@/app/admin/actions';
import type { TieGroup, DrawRecord } from '@/lib/bolao/tiebreak';

export interface TiebreakEntry {
  group: TieGroup;
  /** Nomes dos participantes (alinhado 1:1 com group.memberIds). */
  memberNames: (string | null)[];
  /** Sorteio salvo, se existir. */
  draw?: DrawRecord;
  /** Label legível do escopo (ex.: "Classificação Geral", "Rodada 2 · Grupos"). */
  scopeLabel: string;
}

interface Props {
  entries: TiebreakEntry[];
}

// ── Painel de um grupo pendente ───────────────────────────────────────────────

function PendingPanel({ entry }: { entry: TiebreakEntry }) {
  const { group, memberNames } = entry;
  // Estado: ordering[i] = user_id escolhido para a posição i
  const [ordering, setOrdering] = useState<string[]>(() =>
    Array(group.memberIds.length).fill(''),
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const allFilled = ordering.every((v) => v !== '');
  const isUnique = new Set(ordering.filter(Boolean)).size === ordering.filter(Boolean).length;
  const canSubmit = allFilled && isUnique;

  function setPosition(pos: number, userId: string) {
    setOrdering((prev) => {
      const next = [...prev];
      next[pos] = userId;
      return next;
    });
    setMsg(null);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setMsg(null);
    startTransition(async () => {
      // O revalidatePath('/admin') dentro da action já refaz o RSC — o item
      // migra sozinho deste card pro "Histórico recente" quando `entry.draw`
      // passar a existir, sem precisar de estado otimista local.
      const res = await recordTiebreakDraw(group, ordering);
      if (!res.ok) setMsg(res.error ?? 'Erro ao salvar o sorteio.');
    });
  }

  return (
    <div className="tiebreak-panel">
      <div className="tiebreak-scope">
        <AlertTriangle size={15} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <span>
          <strong>{entry.scopeLabel}</strong> — empate nas posições{' '}
          {entry.group.topPosition}–{entry.group.topPosition + entry.group.memberIds.length - 1}
        </span>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
        Participantes empatados:&nbsp;
        {memberNames.map((n, i) => (
          <strong key={group.memberIds[i]}>{n ?? 'Sem nome'}{i < memberNames.length - 1 ? ', ' : ''}</strong>
        ))}
      </p>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
        Após o sorteio ao vivo, defina a ordem abaixo:
      </p>

      <div className="tiebreak-order-inputs">
        {ordering.map((val, pos) => (
          <div key={pos} className="tiebreak-order-row">
            <span className="tiebreak-order-pos">{pos + 1}º</span>
            <select
              className="tiebreak-select"
              value={val}
              onChange={(e) => setPosition(pos, e.target.value)}
              aria-label={`${pos + 1}ª posição do sorteio`}
            >
              <option value="">— escolha —</option>
              {group.memberIds.map((id, i) => (
                <option key={id} value={id} disabled={ordering.includes(id) && val !== id}>
                  {memberNames[i] ?? id}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {msg && (
        <p style={{ fontSize: '0.8rem', color: 'var(--danger, #e53e3e)', marginTop: 'var(--space-xs)' }}>
          {msg}
        </p>
      )}

      <button
        className="btn btn-gold btn-sm"
        style={{ marginTop: 'var(--space-sm)' }}
        onClick={handleSubmit}
        disabled={!canSubmit || pending}
      >
        {pending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
        Registrar sorteio
      </button>
    </div>
  );
}

// ── Painel de um grupo já resolvido ──────────────────────────────────────────

function ResolvedPanel({ entry }: { entry: TiebreakEntry }) {
  const { group, draw, memberNames } = entry;
  const [pending, startTransition] = useTransition();

  if (!draw) return null;

  function handleClear() {
    startTransition(async () => {
      // Idem: revalidatePath já refaz o RSC e o item volta pro "Pendentes".
      await clearTiebreakDraw(group.scope, group.signature);
    });
  }

  return (
    <div className="tiebreak-panel tiebreak-panel--resolved">
      <div className="tiebreak-scope">
        <CheckCircle size={15} style={{ color: 'var(--copa-green, #00c853)', flexShrink: 0 }} />
        <span>
          <strong>{entry.scopeLabel}</strong> — sorteio registrado
        </span>
      </div>

      <ol className="tiebreak-result-list">
        {draw.ordering.map((id, i) => {
          const idx = group.memberIds.indexOf(id);
          return (
            <li key={id}>
              <span className="tiebreak-order-pos">{i + 1}º</span>
              {idx >= 0 ? (memberNames[idx] ?? id) : id}
            </li>
          );
        })}
      </ol>

      <button
        className="btn btn-sm"
        style={{ marginTop: 'var(--space-sm)' }}
        onClick={handleClear}
        disabled={pending}
      >
        {pending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={14} />}
        Refazer sorteio
      </button>
    </div>
  );
}

// ── Componentes principais ────────────────────────────────────────────────────

/** Renderizado dentro do card "Pendentes": só os sorteios ainda não registrados. */
export function AdminTiebreakDrawsPending({ entries }: Props) {
  const pending = entries.filter((e) => !e.draw);
  if (pending.length === 0) return null;

  return (
    <section style={{ marginTop: 'var(--space-xl)' }}>
      <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shuffle size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        Sorteios de desempate
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
        {pending.length} sorteio{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''}
      </p>
      {pending.map((entry) => (
        <PendingPanel key={entry.group.signature} entry={entry} />
      ))}
    </section>
  );
}

/** Renderizado dentro do card "Histórico recente": só os sorteios já registrados. */
export function AdminTiebreakDrawsResolved({ entries }: Props) {
  const resolved = entries.filter((e) => e.draw);
  if (resolved.length === 0) return null;

  return (
    <section style={{ marginTop: 'var(--space-xl)' }}>
      <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shuffle size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        Sorteios de desempate registrados
      </h3>
      {resolved.map((entry) => (
        <ResolvedPanel key={entry.group.signature} entry={entry} />
      ))}
    </section>
  );
}
