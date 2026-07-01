'use client';

import { useRef, useState, useTransition } from 'react';
import { FileUp, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { matches } from '@/data/matches';
import { getTeamById } from '@/data/teams';
import { uploadMatchProbabilities, type MatchProbUploadRow } from '@/app/admin/actions';

/** Normaliza para casar cabeçalhos: sem acentos, maiúsculas, trim. */
function norm(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

/** "85,5%" / "4.5" / "12,3" → número. */
function toNum(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace('%', '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : 0;
}

const TEMPLATE_HEADERS = ['Jogo', 'Mandante', 'Visitante', 'Vitória Mandante (%)', 'Empate (%)', 'Vitória Visitante (%)'];

const VALID_MATCH_NUMBERS = new Set(matches.map((m) => m.matchNumber));

type ParseResult = {
  rows: MatchProbUploadRow[];
  matched: number[];
  unmatched: string[];
  missingColumns: string[];
};

/** Acha o índice da coluna cujo cabeçalho casa com algum dos termos. */
function colIndex(headers: string[], test: (h: string) => boolean): number {
  return headers.findIndex((h) => test(norm(h)));
}

function parseSheet(aoa: unknown[][]): ParseResult {
  const headerRow = (aoa[0] ?? []).map((c) => String(c ?? ''));
  const idxJogo = colIndex(headerRow, (h) => h.includes('JOGO') || h.includes('NUMERO') || h.includes('PARTIDA'));
  const idxHomeWin = colIndex(headerRow, (h) => h.includes('VITORIA') && h.includes('MANDANTE'));
  const idxDraw = colIndex(headerRow, (h) => h.includes('EMPATE'));
  const idxAwayWin = colIndex(headerRow, (h) => h.includes('VITORIA') && h.includes('VISITANTE'));

  const missingColumns: string[] = [];
  if (idxJogo === -1) missingColumns.push(TEMPLATE_HEADERS[0]);
  if (idxHomeWin === -1) missingColumns.push(TEMPLATE_HEADERS[3]);
  if (idxDraw === -1) missingColumns.push(TEMPLATE_HEADERS[4]);
  if (idxAwayWin === -1) missingColumns.push(TEMPLATE_HEADERS[5]);

  const rows: MatchProbUploadRow[] = [];
  const matched: number[] = [];
  const unmatched: string[] = [];

  if (missingColumns.length === 0) {
    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i] ?? [];
      const rawJogo = r[idxJogo];
      if (rawJogo == null || String(rawJogo).trim() === '') continue;
      const matchNumber = parseInt(String(rawJogo).replace(/\D/g, ''), 10);
      if (!Number.isFinite(matchNumber) || !VALID_MATCH_NUMBERS.has(matchNumber)) {
        unmatched.push(String(rawJogo));
        continue;
      }
      rows.push({
        matchNumber,
        homeWin: toNum(r[idxHomeWin]),
        draw: toNum(r[idxDraw]),
        awayWin: toNum(r[idxAwayWin]),
      });
      matched.push(matchNumber);
    }
  }
  return { rows, matched, unmatched, missingColumns };
}

function teamLabel(id: string | null, placeholder?: string): string {
  if (id) return getTeamById(id)?.name ?? id;
  return placeholder || 'A definir';
}

export function AdminMatchProbabilitiesUpload() {
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
      if (res.missingColumns.length > 0) {
        setError(`Coluna(s) não encontrada(s): ${res.missingColumns.join(', ')}. Baixe o template abaixo para garantir os cabeçalhos certos.`);
        return;
      }
      if (res.rows.length === 0) {
        setError('Nenhum jogo reconhecido. Confira os números na coluna "Jogo".');
        return;
      }
      setParsed(res);
    } catch (err) {
      setError('Não consegui ler a planilha. Use .xlsx, .xls ou .csv.');
      console.error(err);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const sorted = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
    const rows = sorted.map((m) => [
      m.matchNumber,
      teamLabel(m.homeTeamId, m.homeTeamPlaceholder),
      teamLabel(m.awayTeamId, m.awayTeamPlaceholder),
      '',
      '',
      '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Probabilidades');
    XLSX.writeFile(wb, 'probabilidades-jogos-template.xlsx');
  }

  function onSubmit() {
    if (!parsed) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await uploadMatchProbabilities(parsed.rows);
      if (res.ok) {
        setResult(`Probabilidades atualizadas: ${res.count} jogos.`);
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
        Planilha com 6 colunas: <strong>Jogo · Mandante · Visitante · Vitória Mandante (%) · Empate (%) · Vitória Visitante (%)</strong>.
        As colunas Mandante/Visitante são só referência — a linha é identificada pelo número do jogo.
      </p>

      <div className="admin-prob-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
          <Download size={15} /> Baixar template
        </button>

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
      </div>

      {parsed && (
        <div className="admin-prob-preview">
          <span className="admin-prob-ok">
            <CheckCircle2 size={15} /> {parsed.matched.length} jogos reconhecidos
          </span>
          {parsed.unmatched.length > 0 && (
            <span className="admin-prob-warn" title={parsed.unmatched.join(', ')}>
              <AlertTriangle size={15} /> {parsed.unmatched.length} não reconhecidos
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
