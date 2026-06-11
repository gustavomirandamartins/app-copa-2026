'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
} from 'lucide-react';
import { requestManualPix } from '@/app/pagamento/actions';
import './payment.css';

interface Props {
  amountLabel: string;
  pixKey: string | null;
  pixReceiptEmail: string | null;
  pixCopiaECola: string | null;
  pixQrDataUrl: string | null;
  hasPendingRequest: boolean;
}

export function PaymentOptions({
  amountLabel,
  pixKey,
  pixReceiptEmail,
  pixCopiaECola,
  pixQrDataUrl,
  hasPendingRequest,
}: Props) {
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardLoading, startCard] = useTransition();

  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(hasPendingRequest);
  const [pixPending, startPix] = useTransition();

  function payWithCard() {
    setCardError(null);
    startCard(async () => {
      try {
        const res = await fetch('/api/checkout', { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.url) {
          window.location.href = data.url;
        } else {
          setCardError(
            data?.error ?? 'Não foi possível iniciar o pagamento com cartão.',
          );
        }
      } catch {
        setCardError('Falha de conexão. Verifique sua internet e tente novamente.');
      }
    });
  }

  async function copyCode() {
    if (!pixCopiaECola) return;
    try {
      await navigator.clipboard.writeText(pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function confirmPix() {
    setPixError(null);
    startPix(async () => {
      const res = await requestManualPix(note);
      if (res.ok) {
        setSubmitted(true);
      } else {
        setPixError(res.error ?? 'Não foi possível registrar o pagamento.');
      }
    });
  }

  // Já enviou o comprovante / tem solicitação pendente.
  if (submitted) {
    return (
      <div className="pay-pending glass-card-static">
        <Clock size={32} style={{ color: 'var(--gold)' }} />
        <h2>Pagamento em análise</h2>
        <p>
          Recebemos seu aviso de pagamento via Pix. Assim que confirmarmos o
          comprovante, seu acesso Premium será liberado e você poderá dar seus
          palpites.
        </p>
        {pixReceiptEmail && (
          <p className="pay-muted">
            Ainda não enviou o comprovante? Mande para{' '}
            <a href={`mailto:${pixReceiptEmail}`}>{pixReceiptEmail}</a>.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="pay-options">
      {/* ── Cartão (Stripe) ─────────────────────────────── */}
      <section className="pay-card">
        <header className="pay-card-head">
          <CreditCard size={20} style={{ color: 'var(--gold)' }} />
          <div>
            <h2>Cartão de crédito</h2>
            <p className="pay-muted">Liberação na hora, com pagamento seguro via Stripe.</p>
          </div>
        </header>
        {cardError && (
          <div className="auth-msg error">
            <AlertCircle size={16} />
            {cardError}
          </div>
        )}
        <button className="btn btn-primary" onClick={payWithCard} disabled={cardLoading}>
          {cardLoading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Redirecionando…
            </>
          ) : (
            <>
              <CreditCard size={16} /> Pagar {amountLabel} com cartão
            </>
          )}
        </button>
      </section>

      <div className="pay-divider"><span>ou</span></div>

      {/* ── Pix manual ──────────────────────────────────── */}
      <section className="pay-card">
        <header className="pay-card-head">
          <QrCode size={20} style={{ color: 'var(--copa-green)' }} />
          <div>
            <h2>Pix</h2>
            <p className="pay-muted">
              Pague o Pix e nos avise — liberamos seu acesso após conferir o comprovante.
            </p>
          </div>
        </header>

        {!pixKey ? (
          <div className="auth-msg error">
            <AlertCircle size={16} />
            Pagamento via Pix indisponível no momento. Use o cartão acima.
          </div>
        ) : (
          <>
            <ol className="pay-steps">
              <li>
                Abra o app do seu banco e pague <strong>{amountLabel}</strong> via Pix
                {pixQrDataUrl ? ' escaneando o QR Code' : ''} ou usando o código copia e cola abaixo.
              </li>
              <li>
                Envie o comprovante para{' '}
                {pixReceiptEmail ? (
                  <a href={`mailto:${pixReceiptEmail}`}>{pixReceiptEmail}</a>
                ) : (
                  'o e-mail do organizador'
                )}
                .
              </li>
              <li>Clique em “Já fiz o pagamento” para entrar na fila de aprovação.</li>
            </ol>

            {pixQrDataUrl && (
              <div className="pay-qr">
                <Image src={pixQrDataUrl} alt="QR Code Pix" width={200} height={200} unoptimized />
              </div>
            )}

            <div className="pay-field">
              <span className="auth-label">Chave Pix</span>
              <div className="pay-keyrow">
                <code>{pixKey}</code>
              </div>
            </div>

            {pixCopiaECola && (
              <div className="pay-field">
                <span className="auth-label">Pix copia e cola</span>
                <div className="pay-copyrow">
                  <code className="pay-code">{pixCopiaECola}</code>
                  <button type="button" className="btn btn-gold btn-sm" onClick={copyCode}>
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div className="pay-field">
              <label className="auth-label" htmlFor="pix-note">
                Observação (opcional)
              </label>
              <textarea
                id="pix-note"
                className="auth-input"
                rows={2}
                placeholder="Ex.: paguei às 14h pelo app do banco X"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </div>

            {pixError && (
              <div className="auth-msg error">
                <AlertCircle size={16} />
                {pixError}
              </div>
            )}

            <button className="btn btn-gold" onClick={confirmPix} disabled={pixPending}>
              {pixPending ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Registrando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Já fiz o pagamento
                </>
              )}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
