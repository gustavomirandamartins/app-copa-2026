import { redirect } from 'next/navigation';

// O Simulador foi aposentado e substituído pelo Bolão Premium.
// Mantemos a rota redirecionando para não quebrar links antigos.
export default function SimuladorPage() {
  redirect('/bolao');
}
