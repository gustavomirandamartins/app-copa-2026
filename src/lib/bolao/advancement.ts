import type { createAdminClient } from '@/lib/supabase/admin';
import { matches as staticMatches } from '@/data/matches';

type Admin = ReturnType<typeof createAdminClient>;

interface MatchRow {
  id: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
}

/**
 * Decide vencedor/perdedor de um confronto de mata-mata já finalizado.
 * Empate no tempo normal é resolvido pelos pênaltis (home_penalties/
 * away_penalties, derivados em extractScore). Enquanto não houver resultado
 * decisivo, retorna null — o avanço só acontece quando a vaga está definida.
 */
function decide(m: MatchRow): { winner: string | null; loser: string | null } {
  if (m.status !== 'finished' || m.home_score == null || m.away_score == null) {
    return { winner: null, loser: null };
  }
  const home = m.home_team_id;
  const away = m.away_team_id;
  if (m.home_score > m.away_score) return { winner: home, loser: away };
  if (m.away_score > m.home_score) return { winner: away, loser: home };
  // Empate → pênaltis.
  if (
    m.home_penalties != null &&
    m.away_penalties != null &&
    m.home_penalties !== m.away_penalties
  ) {
    return m.home_penalties > m.away_penalties
      ? { winner: home, loser: away }
      : { winner: away, loser: home };
  }
  return { winner: null, loser: null };
}

/** Interpreta placeholders "Vencedor do Jogo 73" / "Perdedor do Jogo 101". */
function feeder(placeholder: string | undefined): { kind: 'W' | 'L'; number: number } | null {
  if (!placeholder) return null;
  const m = placeholder.match(/^(Vencedor|Perdedor) do Jogo (\d+)$/i);
  if (!m) return null;
  return { kind: m[1][0].toUpperCase() === 'V' ? 'W' : 'L', number: Number(m[2]) };
}

/**
 * Propaga as seleções classificadas para a próxima fase do mata-mata.
 *
 * A estrutura do chaveamento (qual jogo alimenta qual vaga) está codificada
 * nos placeholders do seed estático (`@/data/matches`): "Vencedor do Jogo N"
 * e "Perdedor do Jogo N" (este último só na disputa de 3º lugar). Para cada
 * jogo alimentado por outro, resolvemos o vencedor/perdedor pelo placar já
 * gravado no banco e preenchemos home_team_id/away_team_id da vaga.
 *
 * Roda dentro do sync (única origem de placares), logo as seleções da próxima
 * fase são atualizadas assim que um confronto é decidido. Idempotente: só grava
 * quando o time resolvido difere do que já está no banco.
 *
 * Observação: os vencedores são calculados a partir das linhas JÁ finalizadas
 * (que sempre têm os times definidos), então rodadas encadeadas que tenham sido
 * decididas entre dois syncs são propagadas no mesmo passo.
 */
export async function applyKnockoutAdvancement(admin: Admin): Promise<{ advanced: number }> {
  const { data, error } = await admin
    .from('matches')
    .select('id, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id');
  if (error) throw new Error(`advancement: ler matches: ${error.message}`);

  const rows = (data ?? []) as MatchRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  // matchNumber → time vencedor/perdedor (apenas confrontos decididos).
  const winnerByNum = new Map<number, string>();
  const loserByNum = new Map<number, string>();
  for (const sm of staticMatches) {
    const row = byId.get(sm.id);
    if (!row) continue;
    const { winner, loser } = decide(row);
    if (winner) winnerByNum.set(sm.matchNumber, winner);
    if (loser) loserByNum.set(sm.matchNumber, loser);
  }

  const resolve = (f: ReturnType<typeof feeder>) =>
    f ? (f.kind === 'W' ? winnerByNum.get(f.number) : loserByNum.get(f.number)) ?? null : null;

  let advanced = 0;
  for (const sm of staticMatches) {
    const fh = feeder(sm.homeTeamPlaceholder);
    const fa = feeder(sm.awayTeamPlaceholder);
    if (!fh && !fa) continue; // jogo não alimentado por outro (grupos / R32).

    const row = byId.get(sm.id);
    if (!row) continue;

    const desiredHome = resolve(fh);
    const desiredAway = resolve(fa);

    const update: Record<string, string> = {};
    if (desiredHome && desiredHome !== row.home_team_id) update.home_team_id = desiredHome;
    if (desiredAway && desiredAway !== row.away_team_id) update.away_team_id = desiredAway;
    if (Object.keys(update).length === 0) continue;

    const { error: upErr } = await admin.from('matches').update(update).eq('id', sm.id);
    if (upErr) throw new Error(`advancement: update ${sm.id}: ${upErr.message}`);
    advanced++;
  }

  return { advanced };
}
