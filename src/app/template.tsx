/**
 * Page reveal global: template.tsx REMONTA a cada navegação (ao contrário
 * do layout), então a animação de entrada `.page-reveal` toca de novo em
 * toda troca de página. A animação é SÓ opacidade — transform ou filter
 * neste wrapper criariam um "backdrop root" acima de todo o app e
 * quebrariam o backdrop-filter de todos os elementos de vidro.
 * Ver [[transform-breaks-backdrop-filter]] e .page-reveal no globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-reveal">{children}</div>;
}
