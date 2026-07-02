'use client';

import { useRef, useState, useTransition } from 'react';
import { DatabaseBackup, Download, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { exportBackup, restoreBackup, type BackupData } from '@/app/admin/actions';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminBackup() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingExport, startExport] = useTransition();
  const [pendingRestore, startRestore] = useTransition();
  const [pendingFile, setPendingFile] = useState<{ name: string; data: BackupData; rowCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    setResult(null);
    startExport(async () => {
      const res = await exportBackup();
      if (!res.ok || !res.data) {
        setError(res.error ?? 'Erro ao gerar o backup.');
        return;
      }
      downloadJson(res.data, `backup-copa2026-${new Date().toISOString().slice(0, 10)}.json`);
      setResult('Backup baixado com sucesso.');
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    setPendingFile(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      if (!data || typeof data !== 'object' || !data.tables) {
        setError('Arquivo não parece ser um backup válido.');
        return;
      }
      const rowCount = Object.values(data.tables).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
      setPendingFile({ name: file.name, data, rowCount });
    } catch {
      setError('Não consegui ler o arquivo. Precisa ser o .json gerado pelo "Baixar backup".');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function confirmRestore() {
    if (!pendingFile) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      `Tem certeza? Isso vai SOBRESCREVER os dados atuais do banco (${pendingFile.rowCount} linhas de "${pendingFile.name}"). Essa ação não tem volta.`,
    );
    if (!ok) return;

    setError(null);
    setResult(null);
    startRestore(async () => {
      const res = await restoreBackup(pendingFile.data);
      if (!res.ok) {
        setError(res.error ?? 'Erro ao restaurar o backup.');
        return;
      }
      const total = Object.values(res.restored ?? {}).reduce((s, n) => s + (n ?? 0), 0);
      setResult(`Backup restaurado: ${total} linhas atualizadas.`);
      setPendingFile(null);
    });
  }

  return (
    <div className="admin-prob-upload">
      <p className="admin-prob-hint">
        Baixa um <strong>.json</strong> com todas as tabelas do banco (times, palpites, pontuação, probabilidades, sorteios, pagamentos...).
        Carregar um backup <strong>sobrescreve</strong> os dados existentes com o conteúdo do arquivo — não apaga o que foi criado depois do backup.
      </p>

      <div className="admin-prob-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport} disabled={pendingExport}>
          {pendingExport ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
          {pendingExport ? 'Gerando…' : 'Baixar backup'}
        </button>

        <label className="admin-prob-drop">
          <Upload size={18} />
          <span>{pendingFile?.name ?? 'Carregar backup (.json)'}</span>
          <input ref={inputRef} type="file" accept=".json,application/json" onChange={onFile} hidden />
        </label>
      </div>

      {pendingFile && (
        <div className="admin-prob-preview">
          <span className="admin-prob-ok">
            <DatabaseBackup size={15} /> {pendingFile.rowCount} linhas no arquivo
          </span>
          <button className="btn btn-gold btn-sm" onClick={confirmRestore} disabled={pendingRestore}>
            {pendingRestore ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
            {pendingRestore ? 'Restaurando…' : 'Restaurar este backup'}
          </button>
        </div>
      )}

      {error && <p className="admin-prob-msg admin-prob-msg-err"><AlertTriangle size={15} /> {error}</p>}
      {result && <p className="admin-prob-msg admin-prob-msg-ok"><CheckCircle2 size={15} /> {result}</p>}
    </div>
  );
}
