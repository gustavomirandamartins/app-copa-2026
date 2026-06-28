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

function PendingPanel({ entry, onDone }: { entry: TiebreakEntry; onDone: () => void }) {
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
      const res = await recordTiebreakDraw(group, ordering);
      if (res.ok) onDone();
      else setMsg(res.error ?? 'Erro ao salvar o sorteio.');
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

function ResolvedPanel({ entry, onRedo }: { entry: TiebreakEntry; onRedo: () => void }) {
  const { group, draw, memberNames } = entry;
  const [pending, startTransition] = useTransition();

  if (!draw) return null;

  function handleClear() {
    startTransition(async () => {
      await clearTiebreakDraw(group.scope, group.signature);
      onRedo();
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

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminTiebreakDraws({ entries }: Props) {
  // Refresh local após ação (o revalidatePath já cuida do server; aqui só
  // controla se mostramos "pendente" ou "resolvido" otimisticamente).
  const [resolvedSigs, setResolvedSigs] = useState<Set<string>>(
    () => new Set(entries.filter((e) => e.draw).map((e) => e.group.signature)),
  );

  if (entries.length === 0) {
    return (
      <div className="glass-card-static" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <CheckCircle size={16} style={{ color: 'var(--copa-green, #00c853)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhum sorteio pendente no momento.</p>
      </div>
    );
  }

  const pending = entries.filter((e) => !resolvedSigs.has(e.group.signature));
  const resolved = entries.filter((e) => resolvedSigs.has(e.group.signature));

  return (
    <section style={{ marginTop: 'var(--space-xl)' }}>
      <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shuffle size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        Sorteios de desempate
      </h3>

      {pending.length > 0 && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            {pending.length} sorteio{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''}
          </p>
          {pending.map((entry) => (
            <PendingPanel
              key={entry.group.signature}
              entry={entry}
              onDone={() => setResolvedSigs((prev) => new Set([...prev, entry.group.signature]))}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            Sorteios registrados
          </p>
          {resolved.map((entry) => (
            <ResolvedPanel
              key={entry.group.signature}
              entry={entry}
              onRedo={() => setResolvedSigs((prev) => {
                const next = new Set(prev);
                next.delete(entry.group.signature);
                return next;
              })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
