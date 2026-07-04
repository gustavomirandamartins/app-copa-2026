import { NextResponse, type NextRequest } from 'next/server';
import { runLivePoll } from '@/lib/football-data/sync';

/**
 * GET /api/sync/football/live
 * Polling ao vivo (football-data.org) — só chama a API quando há um jogo
 * nosso na janela de "potencialmente ao vivo" (ver runLivePoll()). A
 * football-data.org não tem teto diário (só 10 req/min), então dá pra rodar
 * com frequência sem se preocupar com cota.
 *
 * Disparo: pg_cron/pg_net do próprio Supabase a cada 1-5min (Vercel Hobby só
 * permite Cron 1x/dia, não dá pra usar Cron nativo do Vercel aqui).
 * Segurança: header Authorization: Bearer <CRON_SECRET> (mesmo padrão da
 * rota diária) — importante aqui porque essa rota é chamada de fora do Vercel.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
  }

  try {
    const result = await runLivePoll();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
