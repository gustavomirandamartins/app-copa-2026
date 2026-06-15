import 'server-only';
import https from 'node:https';
import { UFMG_NAME_TO_TEAM_ID } from '@/data/ufmg-probabilities';
import type { UfmgProbability } from '@/lib/types';

/**
 * Scraper das probabilidades da UFMG (mat.ufmg.br/futebol).
 *
 * As tabelas são HTML estático embutido no corpo da página (uma `<table>` por
 * fase). Buscamos as 6 fases e montamos um registro por seleção.
 *
 * O certificado TLS do servidor da UFMG tem a cadeia incompleta (falta o
 * intermediário), então o `fetch` padrão recusa a conexão. Usamos o módulo
 * nativo `node:https` com verificação desligada — restrito a esse host
 * conhecido e somente no servidor (este módulo é `server-only`).
 */

const BASE = 'https://www.mat.ufmg.br/futebol';

const STAGE_SLUGS = {
  champion: 'campeao-copa-do-mundo-2026',
  final: 'final-copa-do-mundo-2026',
  semifinal: 'semifinal-copa-do-mundo-2026',
  quarterFinal: 'quartas-de-final-copa-do-mundo-2026',
  roundOf16: 'oitavas-de-final-copa-do-mundo-2026',
  roundOf32: 'dezesseis-avos-de-final-da-copa-do-mundo-2026',
} as const;

type Stage = keyof typeof STAGE_SLUGS;

// O certificado da UFMG tem cadeia incompleta; baixamos a verificação só para
// esse host conhecido (server-only).
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        agent: insecureAgent,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BolaoMindu/1.0)' },
        timeout: 15000,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`respondeu ${status}`));
          return;
        }
        res.setEncoding('utf-8');
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&aacute;/gi, 'á')
    .replace(/&nbsp;/gi, ' ');
}

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, '')).trim();

/** Extrai { teamId: percentual } de uma página de fase. */
function parseStage(html: string): Map<string, number> {
  const result = new Map<string, number>();
  // Restringe ao corpo do post para evitar tabelas de layout do tema.
  const body =
    html.match(/<div class="entry-content">([\s\S]*?)<\/div><!-- .entry-content/)?.[1] ??
    html;

  const rows = body.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(stripTags);
    if (cells.length < 3) continue;
    if (!/^\d+$/.test(cells[0])) continue; // 1ª célula = posição numérica
    const name = cells[1].toUpperCase();
    const teamId = UFMG_NAME_TO_TEAM_ID[name];
    if (!teamId) continue;
    const pct = Number(cells[2].replace(',', '.'));
    if (Number.isFinite(pct)) result.set(teamId, pct);
  }
  return result;
}

async function fetchStage(stage: Stage): Promise<Map<string, number>> {
  const url = `${BASE}/${STAGE_SLUGS[stage]}/`;
  try {
    return parseStage(await httpsGet(url));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro';
    throw new Error(`UFMG ${stage} ${message}`);
  }
}

export interface ScrapedProbability extends UfmgProbability {
  teamId: string;
}

/**
 * Busca as 6 fases e devolve um registro por seleção. Lança se alguma fase
 * vier vazia (mudança de layout / página fora do ar), para não sobrescrever
 * o banco com dados quebrados.
 */
export async function scrapeUfmgProbabilities(): Promise<ScrapedProbability[]> {
  const stages = Object.keys(STAGE_SLUGS) as Stage[];
  const maps = await Promise.all(stages.map(fetchStage));
  const byStage = Object.fromEntries(stages.map((s, i) => [s, maps[i]])) as Record<
    Stage,
    Map<string, number>
  >;

  for (const s of stages) {
    if (byStage[s].size < 40) {
      throw new Error(`UFMG fase "${s}" retornou apenas ${byStage[s].size} seleções.`);
    }
  }

  const teamIds = new Set<string>();
  for (const s of stages) for (const id of byStage[s].keys()) teamIds.add(id);

  return [...teamIds]
    .map((teamId) => ({
      teamId,
      champion: byStage.champion.get(teamId) ?? 0,
      final: byStage.final.get(teamId) ?? 0,
      semifinal: byStage.semifinal.get(teamId) ?? 0,
      quarterFinal: byStage.quarterFinal.get(teamId) ?? 0,
      roundOf16: byStage.roundOf16.get(teamId) ?? 0,
      roundOf32: byStage.roundOf32.get(teamId) ?? 0,
    }))
    .sort((a, b) => b.champion - a.champion);
}
