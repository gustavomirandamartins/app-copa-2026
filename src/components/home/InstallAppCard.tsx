'use client';

import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

const IOS_STEPS = [
  { icon: '⬆', text: 'Toque em Compartilhar na barra inferior do Safari' },
  { icon: '＋', text: 'Role e toque em "Adicionar à Tela de Início"' },
  { icon: '✓', text: 'Confirme tocando em "Adicionar"' },
];

const ANDROID_STEPS = [
  { icon: '⋮', text: 'Toque nos três pontos no canto superior do Chrome' },
  { icon: '＋', text: 'Toque em "Adicionar à tela inicial"' },
  { icon: '✓', text: 'Confirme tocando em "Adicionar"' },
];

export function InstallAppCard() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  if (platform === null || platform === 'other') return null;

  const steps = platform === 'ios' ? IOS_STEPS : ANDROID_STEPS;
  const platformLabel = platform === 'ios' ? 'Safari · iOS' : 'Chrome · Android';

  return (
    <div className="glass-card-static dash-install-card">
      <span className="dash-card-title">
        <Smartphone size={16} /> Instale o app
      </span>

      {installed ? (
        <p className="install-done">
          App instalado! Acesse pelo ícone na tela inicial. 🏆
        </p>
      ) : (
        <>
          <p className="install-platform">{platformLabel}</p>
          <ol className="install-steps">
            {steps.map((step, i) => (
              <li key={i} className="install-step">
                <span className="install-step-icon">{step.icon}</span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
