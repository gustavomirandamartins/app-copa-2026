import { NextResponse, type NextRequest } from 'next/server';
import { runFootballSync } from '@/lib/football-data/sync';

/**
 * GET /api/sync/football
 * Sincroniza placares/status e classificação da Copa a partir da
 * football-data.org para o Supabase (fonte da verdade do app).
 *
 * Disparo: Vercel Cron (a cada 30 min, ver vercel.json) ou admin manual.
 * Segurança: header Authorization: Bearer <CRON_SECRET>.
 *
 * Custo de cota: 2 requisições por execução (matches + standings).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
  }

  try {
    const result = await runFootballSync();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
