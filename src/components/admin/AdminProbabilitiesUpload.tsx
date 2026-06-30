'use client';

import { useRef, useState, useTransition } from 'react';
import { FileUp, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { teams } from '@/data/teams';
import { UFMG_NAME_TO_TEAM_ID } from '@/data/ufmg-probabilities';
import { uploadTeamProbabilities, type ProbUploadRow } from '@/app/admin/actions';

/** Normaliza para casar nomes: sem acentos, maiúsculas, trim. */
function norm(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

/** name(normalizado) → teamId, combinando o mapa UFMG e os nomes das seleções. */
const NAME_TO_ID: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [name, id] of Object.entries(UFMG_NAME_TO_TEAM_ID)) m[norm(name)] = id;
  for (const t of teams) m[norm(t.name)] = t.id;
  return m;
})();

/** "85,5%" / "4.5" / "12,3" → número. */
function toNum(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace('%', '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : 0;
}

type ParseResult = {
  rows: ProbUploadRow[];
  matched: string[];
  unmatched: string[];
};

/** Acha o índice da coluna cujo cabeçalho casa com algum dos termos. */
function colIndex(headers: string[], test: (h: string) => boolean): number {
  return headers.findIndex((h) => test(norm(h)));
}

function parseSheet(aoa: unknown[][]): ParseResult {
  const headerRow = (aoa[0] ?? []).map((c) => String(c ?? ''));
  const idxName = colIndex(headerRow, (h) => /SELE|TIME|EQUIPE|PAIS/.test(h));
  const idx32 = colIndex(headerRow, (h) => h.includes('16'));
  const idx16 = colIndex(headerRow, (h) => h.includes('OITAVA'));
  const idxQ = colIndex(headerRow, (h) => h.includes('QUARTA'));
  const idxS = colIndex(headerRow, (h) => h.startsWith('SEMI'));
  const idxF = colIndex(headerRow, (h) => h === 'FINAL' || h.endsWith(' FINAL'));
  const idxC = colIndex(headerRow, (h) => h.includes('CAMPE') || h.includes('TITUL'));

  const rows: ProbUploadRow[] = [];
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] ?? [];
    const rawName = r[idxName];
    if (rawName == null || String(rawName).trim() === '') continue;
    const teamId = NAME_TO_ID[norm(rawName)];
    if (!teamId) {
      unmatched.push(String(rawName));
      continue;
    }
    rows.push({
      teamId,
      roundOf32: toNum(r[idx32]),
      roundOf16: toNum(r[idx16]),
      quarterFinal: toNum(r[idxQ]),
      semiFinal: toNum(r[idxS]),
      final: toNum(r[idxF]),
      champion: toNum(r[idxC]),
    });
    matched.push(String(rawName));
  }
  return { rows, matched, unmatched };
}

export function AdminProbabilitiesUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    setParsed(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
      const res = parseSheet(aoa as unknown[][]);
      if (res.rows.length === 0) {
        setError('Nenhuma seleção reconhecida. Confira os cabeçalhos: Seleção · 16avos · Oitavas · Quartas · Semi · Final · Campeão.');
        return;
      }
      setParsed(res);
    } catch (err) {
      setError('Não consegui ler a planilha. Use .xlsx, .xls ou .csv.');
      console.error(err);
    }
  }

  function onSubmit() {
    if (!parsed) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await uploadTeamProbabilities(parsed.rows);
      if (res.ok) {
        setResult(`Probabilidades atualizadas: ${res.count} seleções.`);
        setParsed(null);
        setFileName('');
        if (inputRef.current) inputRef.current.value = '';
      } else {
        setError(res.error ?? 'Erro ao salvar.');
      }
    });
  }

  return (
    <div className="admin-prob-upload">
      <p className="admin-prob-hint">
        Planilha com 7 colunas: <strong>Seleção · 16avos · Oitavas · Quartas · Semi · Final · Campeão</strong>.
        Os valores podem estar em % ou número. Sobrescreve as probabilidades exibidas no dashboard.
      </p>

      <label className="admin-prob-drop">
        <FileUp size={18} />
        <span>{fileName || 'Escolher planilha (.xlsx, .csv)'}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          hidden
        />
      </label>

      {parsed && (
        <div className="admin-prob-preview">
          <span className="admin-prob-ok">
            <CheckCircle2 size={15} /> {parsed.matched.length} seleções reconhecidas
          </span>
          {parsed.unmatched.length > 0 && (
            <span className="admin-prob-warn" title={parsed.unmatched.join(', ')}>
              <AlertTriangle size={15} /> {parsed.unmatched.length} não reconhecidas
            </span>
          )}
          <button className="btn btn-gold btn-sm" onClick={onSubmit} disabled={pending}>
            {pending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileUp size={15} />}
            {pending ? 'Enviando…' : `Salvar ${parsed.rows.length} probabilidades`}
          </button>
        </div>
      )}

      {error && <p className="admin-prob-msg admin-prob-msg-err"><AlertTriangle size={15} /> {error}</p>}
      {result && <p className="admin-prob-msg admin-prob-msg-ok"><CheckCircle2 size={15} /> {result}</p>}
    </div>
  );
}
