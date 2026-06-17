'use client';

import { useState } from 'react';
import { Gift, Copy, Check, Share2 } from 'lucide-react';

interface Props {
  code: string;
  /** Quantidade de pontos de bônus já acumulados por indicações. */
  bonus: number;
}

const POINTS_PER_REFERRAL = 5;

export function ReferralCard({ code, bonus }: Props) {
  const [copied, setCopied] = useState(false);
  const referred = Math.floor((bonus ?? 0) / POINTS_PER_REFERRAL);

  function shareMessage(): string {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/bolao`
        : 'https://bolao.mindubier.com';
    return (
      `🏆 Tô no Bolão da Mindu na Copa 2026! Entra com o meu cupom *${code}* ` +
      `ao se cadastrar e bora disputar os prêmios MinduBier. ${url}`
    );
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard pode falhar em contexto inseguro — ignora silenciosamente */
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(shareMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="glass-card-static referral-card animate-slide-up">
      <div className="referral-head">
        <Gift size={18} style={{ color: 'var(--gold)' }} />
        <h3 className="referral-title">Indique e ganhe pontos</h3>
      </div>
      <p className="referral-text">
        Compartilhe seu cupom. Para cada amigo que se cadastrar e pagar usando
        ele, você ganha <strong>+{POINTS_PER_REFERRAL} pontos</strong> — sem limite!
      </p>

      <div className="referral-code-row">
        <div className="referral-code" aria-label="Seu cupom de indicação">
          {code}
        </div>
        <button type="button" className="btn btn-gold btn-sm" onClick={copyCode}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={shareWhatsApp}>
          <Share2 size={15} /> WhatsApp
        </button>
      </div>

      <div className="referral-stats">
        <span>
          <strong>{referred}</strong> {referred === 1 ? 'indicação paga' : 'indicações pagas'}
        </span>
        <span className="referral-bonus">+{bonus} pts de bônus</span>
      </div>
    </section>
  );
}
