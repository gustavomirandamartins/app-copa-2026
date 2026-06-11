'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { saveOnboarding } from '@/app/completar-cadastro/actions';
import type { Profile } from '@/lib/bolao/types';
import '../auth/auth.css';
import './onboarding.css';

const LGPD_TEXT =
  'Li e concordo com o uso dos meus dados pessoais (nome, e-mail, telefone, ' +
  'data de nascimento e endereço) pela MinduBier para participação no Bolão, ' +
  'comunicação sobre o evento e entrega de prêmios, nos termos da Lei nº ' +
  '13.709/2018 (LGPD). Meus dados não serão usados para outros fins nem ' +
  'compartilhados com terceiros para marketing.';

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{0,2})/, '($1');
  if (d.length <= 6) return d.replace(/(\d{2})(\d{0,4})/, '($1) $2');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function maskCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length <= 5 ? d : d.replace(/(\d{5})(\d{0,3})/, '$1-$2');
}

const onlyDigits = (v: string) => v.replace(/\D/g, '');

interface Props {
  profile: Profile | null;
}

export function OnboardingForm({ profile }: Props) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [cep, setCep] = useState(profile?.postal_code ?? '');
  const [street, setStreet] = useState(profile?.address_street ?? '');
  const [number, setNumber] = useState(profile?.address_number ?? '');
  const [complement, setComplement] = useState(profile?.address_complement ?? '');
  const [district, setDistrict] = useState(profile?.address_district ?? '');
  const [city, setCity] = useState(profile?.address_city ?? '');
  const [uf, setUf] = useState(profile?.address_state ?? '');
  const [lgpd, setLgpd] = useState(profile?.agreed_to_lgpd ?? false);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function lookupCep(value: string) {
    const d = onlyDigits(value);
    setCepError(null);
    if (d.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado — preencha o endereço manualmente.');
        return;
      }
      if (data.logradouro) setStreet(data.logradouro);
      if (data.bairro) setDistrict(data.bairro);
      if (data.localidade) setCity(data.localidade);
      if (data.uf) setUf(data.uf);
    } catch {
      setCepError('Não foi possível buscar o CEP — preencha manualmente.');
    } finally {
      setCepLoading(false);
    }
  }

  const valid =
    fullName.trim() !== '' &&
    birthDate !== '' &&
    onlyDigits(phone).length >= 10 &&
    onlyDigits(cep).length === 8 &&
    street.trim() !== '' &&
    number.trim() !== '' &&
    city.trim() !== '' &&
    uf.trim() !== '' &&
    lgpd;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError('Preencha todos os campos obrigatórios e aceite o consentimento.');
      return;
    }
    const fd = new FormData();
    fd.set('full_name', fullName);
    fd.set('birth_date', birthDate);
    fd.set('phone', phone);
    fd.set('postal_code', cep);
    fd.set('address_street', street);
    fd.set('address_number', number);
    fd.set('address_complement', complement);
    fd.set('address_district', district);
    fd.set('address_city', city);
    fd.set('address_state', uf);
    fd.set('agreed_to_lgpd', lgpd ? 'on' : 'off');

    startTransition(async () => {
      const res = await saveOnboarding(fd);
      if (!res.ok) {
        setError(res.error ?? 'Erro ao salvar os dados.');
        return;
      }
      // Dados salvos → vai para a página de pagamento (Cartão ou Pix).
      router.push('/pagamento');
    });
  }

  return (
    <form className="onb-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <span className="auth-label">Nome completo</span>
        <input
          className="auth-input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="onb-row cols-2">
        <div className="auth-field">
          <span className="auth-label">Data de nascimento</span>
          <input
            className="auth-input"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max="2010-12-31"
            required
          />
        </div>
        <div className="auth-field">
          <span className="auth-label">Telefone (celular)</span>
          <input
            className="auth-input"
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            autoComplete="tel"
            required
          />
        </div>
      </div>

      <div className="onb-row cep-uf">
        <div className="auth-field">
          <span className="auth-label">CEP</span>
          <input
            className="auth-input"
            inputMode="numeric"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => {
              const masked = maskCep(e.target.value);
              setCep(masked);
              if (onlyDigits(masked).length === 8) lookupCep(masked);
            }}
            onBlur={(e) => lookupCep(e.target.value)}
            autoComplete="postal-code"
            required
          />
          {cepLoading && (
            <span className="onb-cep-hint">
              <Loader2 size={11} style={{ verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} /> Buscando endereço…
            </span>
          )}
          {cepError && <span className="onb-cep-hint" style={{ color: '#dc2626' }}>{cepError}</span>}
        </div>
        <div className="auth-field">
          <span className="auth-label">Cidade</span>
          <input className="auth-input" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div className="auth-field">
          <span className="auth-label">UF</span>
          <input
            className="auth-input"
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            placeholder="BA"
            required
          />
        </div>
      </div>

      <div className="auth-field">
        <span className="auth-label">Logradouro</span>
        <input className="auth-input" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="address-line1" required />
      </div>

      <div className="onb-row cols-2">
        <div className="auth-field">
          <span className="auth-label">Número</span>
          <input className="auth-input" value={number} onChange={(e) => setNumber(e.target.value)} required />
        </div>
        <div className="auth-field">
          <span className="auth-label">Complemento (opcional)</span>
          <input className="auth-input" value={complement} onChange={(e) => setComplement(e.target.value)} />
        </div>
      </div>

      <div className="auth-field">
        <span className="auth-label">Bairro</span>
        <input className="auth-input" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </div>

      <div className="onb-lgpd">
        <input
          id="lgpd"
          type="checkbox"
          checked={lgpd}
          onChange={(e) => setLgpd(e.target.checked)}
        />
        <label htmlFor="lgpd">{LGPD_TEXT}</label>
      </div>

      {error && (
        <div className="auth-msg error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-gold" disabled={!valid || pending}>
        {pending ? (
          <>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processando…
          </>
        ) : (
          <>
            <CreditCard size={16} /> Salvar e escolher forma de pagamento
          </>
        )}
      </button>
    </form>
  );
}
