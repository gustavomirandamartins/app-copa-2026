/**
 * "Fique de olho!" — o craque a ser observado em cada seleção.
 * Mapeado por id de seleção (ver src/data/teams.ts).
 *
 * Nota: rsa, cpv e jor não constavam na lista enviada pelo cliente;
 * foram preenchidos com nomes de referência e devem ser revisados.
 */
export const keyPlayers: Record<string, string> = {
  // ── CONMEBOL ─────────────────────────────────────────────
  arg: 'Lionel Messi',
  bra: 'Vinícius Júnior',
  uru: 'Federico Valverde',
  col: 'Luis Díaz',
  ecu: 'Moisés Caicedo',
  par: 'Julio Enciso',

  // ── UEFA ─────────────────────────────────────────────────
  ger: 'Jamal Musiala',
  aut: 'David Alaba',
  bel: 'Kevin De Bruyne',
  bih: 'Edin Džeko',
  cro: 'Joško Gvardiol',
  sco: 'Scott McTominay',
  esp: 'Lamine Yamal',
  fra: 'Kylian Mbappé',
  ned: 'Virgil van Dijk',
  eng: 'Harry Kane',
  nor: 'Erling Haaland',
  por: 'Bruno Fernandes',
  cze: 'Tomáš Souček',
  swe: 'Alexander Isak',
  sui: 'Granit Xhaka',
  tur: 'Hakan Çalhanoğlu',

  // ── CAF ──────────────────────────────────────────────────
  alg: 'Riyad Mahrez',
  civ: 'Simon Adingra',
  cod: 'Yoane Wissa',
  egy: 'Mohamed Salah',
  gha: 'Mohammed Kudus',
  mar: 'Achraf Hakimi',
  sen: 'Nicolas Jackson',
  tun: 'Aïssa Laïdouni',
  rsa: 'Percy Tau', // revisar — não estava na lista enviada
  cpv: 'Ryan Mendes', // revisar — não estava na lista enviada

  // ── CONCACAF ─────────────────────────────────────────────
  can: 'Alphonso Davies',
  cuw: 'Juninho Bacuna',
  usa: 'Christian Pulisic',
  hai: 'Duckens Nazon',
  mex: 'Santiago Giménez',
  pan: 'Adalberto Carrasquilla',

  // ── AFC & OFC ────────────────────────────────────────────
  ksa: 'Salem Al-Dawsari',
  aus: 'Mathew Ryan',
  kor: 'Son Heung-min',
  irq: 'Ali Al-Hamadi',
  irn: 'Mehdi Taremi',
  jpn: 'Takefusa Kubo',
  nzl: 'Chris Wood',
  qat: 'Akram Afif',
  uzb: 'Abdukodir Khusanov',
  jor: 'Mousa Al-Tamari', // revisar — não estava na lista enviada
};

export function getKeyPlayer(teamId: string): string | undefined {
  return keyPlayers[teamId];
}
