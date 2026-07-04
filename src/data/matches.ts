import type { GroupId, Match, MatchStage } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════
// Calendário oficial da Copa do Mundo FIFA 2026 (104 jogos).
// Fonte: tabela oficial (sorteio de 05/12/2025).
// dateUTC = horário ET + 4h (EDT = UTC-4). A exibição converte para
// horário de Brasília (America/Sao_Paulo, UTC-3) via formatKickoff().
// ═══════════════════════════════════════════════════════════════

export const matches: Match[] = [
  // ─────────────────────────────────────────────────────────────
  // FASE DE GRUPOS — RODADA 1 (11–17 jun)
  // ─────────────────────────────────────────────────────────────
  { id: 'gs-001', stage: 'group', group: 'A', matchday: 1, homeTeamId: 'mex', awayTeamId: 'rsa', homeGoals: null, awayGoals: null, dateUTC: '2026-06-11T19:00:00Z', stadiumId: 'azteca', status: 'scheduled', matchNumber: 1 },
  { id: 'gs-002', stage: 'group', group: 'A', matchday: 1, homeTeamId: 'kor', awayTeamId: 'cze', homeGoals: null, awayGoals: null, dateUTC: '2026-06-12T02:00:00Z', stadiumId: 'akron', status: 'scheduled', matchNumber: 2 },
  { id: 'gs-003', stage: 'group', group: 'B', matchday: 1, homeTeamId: 'can', awayTeamId: 'bih', homeGoals: null, awayGoals: null, dateUTC: '2026-06-12T19:00:00Z', stadiumId: 'bmo-field', status: 'scheduled', matchNumber: 3 },
  { id: 'gs-004', stage: 'group', group: 'D', matchday: 1, homeTeamId: 'usa', awayTeamId: 'par', homeGoals: null, awayGoals: null, dateUTC: '2026-06-13T01:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 4 },
  { id: 'gs-005', stage: 'group', group: 'B', matchday: 1, homeTeamId: 'qat', awayTeamId: 'sui', homeGoals: null, awayGoals: null, dateUTC: '2026-06-13T19:00:00Z', stadiumId: 'levis', status: 'scheduled', matchNumber: 5 },
  { id: 'gs-006', stage: 'group', group: 'C', matchday: 1, homeTeamId: 'bra', awayTeamId: 'mar', homeGoals: null, awayGoals: null, dateUTC: '2026-06-13T22:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 6 },
  { id: 'gs-007', stage: 'group', group: 'C', matchday: 1, homeTeamId: 'hai', awayTeamId: 'sco', homeGoals: null, awayGoals: null, dateUTC: '2026-06-14T01:00:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 7 },
  { id: 'gs-008', stage: 'group', group: 'D', matchday: 1, homeTeamId: 'aus', awayTeamId: 'tur', homeGoals: null, awayGoals: null, dateUTC: '2026-06-14T04:00:00Z', stadiumId: 'bc-place', status: 'scheduled', matchNumber: 8 },
  { id: 'gs-009', stage: 'group', group: 'E', matchday: 1, homeTeamId: 'ger', awayTeamId: 'cuw', homeGoals: null, awayGoals: null, dateUTC: '2026-06-14T17:00:00Z', stadiumId: 'nrg', status: 'scheduled', matchNumber: 9 },
  { id: 'gs-010', stage: 'group', group: 'F', matchday: 1, homeTeamId: 'ned', awayTeamId: 'jpn', homeGoals: null, awayGoals: null, dateUTC: '2026-06-14T20:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 10 },
  { id: 'gs-011', stage: 'group', group: 'E', matchday: 1, homeTeamId: 'civ', awayTeamId: 'ecu', homeGoals: null, awayGoals: null, dateUTC: '2026-06-14T23:00:00Z', stadiumId: 'lincoln-financial', status: 'scheduled', matchNumber: 11 },
  { id: 'gs-012', stage: 'group', group: 'F', matchday: 1, homeTeamId: 'swe', awayTeamId: 'tun', homeGoals: null, awayGoals: null, dateUTC: '2026-06-15T02:00:00Z', stadiumId: 'bbva', status: 'scheduled', matchNumber: 12 },
  { id: 'gs-013', stage: 'group', group: 'H', matchday: 1, homeTeamId: 'esp', awayTeamId: 'cpv', homeGoals: null, awayGoals: null, dateUTC: '2026-06-15T16:00:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 13 },
  { id: 'gs-014', stage: 'group', group: 'G', matchday: 1, homeTeamId: 'bel', awayTeamId: 'egy', homeGoals: null, awayGoals: null, dateUTC: '2026-06-15T19:00:00Z', stadiumId: 'lumen', status: 'scheduled', matchNumber: 14 },
  { id: 'gs-015', stage: 'group', group: 'H', matchday: 1, homeTeamId: 'ksa', awayTeamId: 'uru', homeGoals: null, awayGoals: null, dateUTC: '2026-06-15T22:00:00Z', stadiumId: 'hard-rock', status: 'scheduled', matchNumber: 15 },
  { id: 'gs-016', stage: 'group', group: 'G', matchday: 1, homeTeamId: 'irn', awayTeamId: 'nzl', homeGoals: null, awayGoals: null, dateUTC: '2026-06-16T01:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 16 },
  { id: 'gs-017', stage: 'group', group: 'I', matchday: 1, homeTeamId: 'fra', awayTeamId: 'sen', homeGoals: null, awayGoals: null, dateUTC: '2026-06-16T19:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 17 },
  { id: 'gs-018', stage: 'group', group: 'I', matchday: 1, homeTeamId: 'irq', awayTeamId: 'nor', homeGoals: null, awayGoals: null, dateUTC: '2026-06-16T22:00:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 18 },
  { id: 'gs-019', stage: 'group', group: 'J', matchday: 1, homeTeamId: 'arg', awayTeamId: 'alg', homeGoals: null, awayGoals: null, dateUTC: '2026-06-17T01:00:00Z', stadiumId: 'arrowhead', status: 'scheduled', matchNumber: 19 },
  { id: 'gs-020', stage: 'group', group: 'J', matchday: 1, homeTeamId: 'aut', awayTeamId: 'jor', homeGoals: null, awayGoals: null, dateUTC: '2026-06-17T04:00:00Z', stadiumId: 'levis', status: 'scheduled', matchNumber: 20 },
  { id: 'gs-021', stage: 'group', group: 'K', matchday: 1, homeTeamId: 'por', awayTeamId: 'cod', homeGoals: null, awayGoals: null, dateUTC: '2026-06-17T17:00:00Z', stadiumId: 'nrg', status: 'scheduled', matchNumber: 21 },
  { id: 'gs-022', stage: 'group', group: 'L', matchday: 1, homeTeamId: 'eng', awayTeamId: 'cro', homeGoals: null, awayGoals: null, dateUTC: '2026-06-17T20:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 22 },
  { id: 'gs-023', stage: 'group', group: 'L', matchday: 1, homeTeamId: 'gha', awayTeamId: 'pan', homeGoals: null, awayGoals: null, dateUTC: '2026-06-17T23:00:00Z', stadiumId: 'bmo-field', status: 'scheduled', matchNumber: 23 },
  { id: 'gs-024', stage: 'group', group: 'K', matchday: 1, homeTeamId: 'uzb', awayTeamId: 'col', homeGoals: null, awayGoals: null, dateUTC: '2026-06-18T02:00:00Z', stadiumId: 'azteca', status: 'scheduled', matchNumber: 24 },

  // ─────────────────────────────────────────────────────────────
  // FASE DE GRUPOS — RODADA 2 (18–23 jun)
  // ─────────────────────────────────────────────────────────────
  { id: 'gs-025', stage: 'group', group: 'A', matchday: 2, homeTeamId: 'cze', awayTeamId: 'rsa', homeGoals: null, awayGoals: null, dateUTC: '2026-06-18T16:00:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 25 },
  { id: 'gs-026', stage: 'group', group: 'B', matchday: 2, homeTeamId: 'sui', awayTeamId: 'bih', homeGoals: null, awayGoals: null, dateUTC: '2026-06-18T19:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 26 },
  { id: 'gs-027', stage: 'group', group: 'B', matchday: 2, homeTeamId: 'can', awayTeamId: 'qat', homeGoals: null, awayGoals: null, dateUTC: '2026-06-18T22:00:00Z', stadiumId: 'bc-place', status: 'scheduled', matchNumber: 27 },
  { id: 'gs-028', stage: 'group', group: 'A', matchday: 2, homeTeamId: 'mex', awayTeamId: 'kor', homeGoals: null, awayGoals: null, dateUTC: '2026-06-19T01:00:00Z', stadiumId: 'akron', status: 'scheduled', matchNumber: 28 },
  { id: 'gs-029', stage: 'group', group: 'D', matchday: 2, homeTeamId: 'usa', awayTeamId: 'aus', homeGoals: null, awayGoals: null, dateUTC: '2026-06-19T19:00:00Z', stadiumId: 'lumen', status: 'scheduled', matchNumber: 29 },
  { id: 'gs-030', stage: 'group', group: 'C', matchday: 2, homeTeamId: 'sco', awayTeamId: 'mar', homeGoals: null, awayGoals: null, dateUTC: '2026-06-19T22:00:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 30 },
  { id: 'gs-031', stage: 'group', group: 'C', matchday: 2, homeTeamId: 'bra', awayTeamId: 'hai', homeGoals: null, awayGoals: null, dateUTC: '2026-06-20T00:30:00Z', stadiumId: 'lincoln-financial', status: 'scheduled', matchNumber: 31 },
  { id: 'gs-032', stage: 'group', group: 'D', matchday: 2, homeTeamId: 'tur', awayTeamId: 'par', homeGoals: null, awayGoals: null, dateUTC: '2026-06-20T04:00:00Z', stadiumId: 'levis', status: 'scheduled', matchNumber: 32 },
  { id: 'gs-033', stage: 'group', group: 'F', matchday: 2, homeTeamId: 'ned', awayTeamId: 'swe', homeGoals: null, awayGoals: null, dateUTC: '2026-06-20T17:00:00Z', stadiumId: 'nrg', status: 'scheduled', matchNumber: 33 },
  { id: 'gs-034', stage: 'group', group: 'E', matchday: 2, homeTeamId: 'ger', awayTeamId: 'civ', homeGoals: null, awayGoals: null, dateUTC: '2026-06-20T20:00:00Z', stadiumId: 'bmo-field', status: 'scheduled', matchNumber: 34 },
  { id: 'gs-035', stage: 'group', group: 'E', matchday: 2, homeTeamId: 'ecu', awayTeamId: 'cuw', homeGoals: null, awayGoals: null, dateUTC: '2026-06-21T00:00:00Z', stadiumId: 'arrowhead', status: 'scheduled', matchNumber: 35 },
  { id: 'gs-036', stage: 'group', group: 'F', matchday: 2, homeTeamId: 'tun', awayTeamId: 'jpn', homeGoals: null, awayGoals: null, dateUTC: '2026-06-21T04:00:00Z', stadiumId: 'bbva', status: 'scheduled', matchNumber: 36 },
  { id: 'gs-037', stage: 'group', group: 'H', matchday: 2, homeTeamId: 'esp', awayTeamId: 'ksa', homeGoals: null, awayGoals: null, dateUTC: '2026-06-21T16:00:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 37 },
  { id: 'gs-038', stage: 'group', group: 'G', matchday: 2, homeTeamId: 'bel', awayTeamId: 'irn', homeGoals: null, awayGoals: null, dateUTC: '2026-06-21T19:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 38 },
  { id: 'gs-039', stage: 'group', group: 'H', matchday: 2, homeTeamId: 'uru', awayTeamId: 'cpv', homeGoals: null, awayGoals: null, dateUTC: '2026-06-21T22:00:00Z', stadiumId: 'hard-rock', status: 'scheduled', matchNumber: 39 },
  { id: 'gs-040', stage: 'group', group: 'G', matchday: 2, homeTeamId: 'nzl', awayTeamId: 'egy', homeGoals: null, awayGoals: null, dateUTC: '2026-06-22T01:00:00Z', stadiumId: 'bc-place', status: 'scheduled', matchNumber: 40 },
  { id: 'gs-041', stage: 'group', group: 'J', matchday: 2, homeTeamId: 'arg', awayTeamId: 'aut', homeGoals: null, awayGoals: null, dateUTC: '2026-06-22T17:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 41 },
  { id: 'gs-042', stage: 'group', group: 'I', matchday: 2, homeTeamId: 'fra', awayTeamId: 'irq', homeGoals: null, awayGoals: null, dateUTC: '2026-06-22T21:00:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 42 },
  { id: 'gs-043', stage: 'group', group: 'I', matchday: 2, homeTeamId: 'nor', awayTeamId: 'sen', homeGoals: null, awayGoals: null, dateUTC: '2026-06-23T00:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 43 },
  { id: 'gs-044', stage: 'group', group: 'J', matchday: 2, homeTeamId: 'jor', awayTeamId: 'alg', homeGoals: null, awayGoals: null, dateUTC: '2026-06-23T03:00:00Z', stadiumId: 'levis', status: 'scheduled', matchNumber: 44 },
  { id: 'gs-045', stage: 'group', group: 'K', matchday: 2, homeTeamId: 'por', awayTeamId: 'uzb', homeGoals: null, awayGoals: null, dateUTC: '2026-06-23T17:00:00Z', stadiumId: 'nrg', status: 'scheduled', matchNumber: 45 },
  { id: 'gs-046', stage: 'group', group: 'L', matchday: 2, homeTeamId: 'eng', awayTeamId: 'gha', homeGoals: null, awayGoals: null, dateUTC: '2026-06-23T20:00:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 46 },
  { id: 'gs-047', stage: 'group', group: 'L', matchday: 2, homeTeamId: 'pan', awayTeamId: 'cro', homeGoals: null, awayGoals: null, dateUTC: '2026-06-23T23:00:00Z', stadiumId: 'bmo-field', status: 'scheduled', matchNumber: 47 },
  { id: 'gs-048', stage: 'group', group: 'K', matchday: 2, homeTeamId: 'col', awayTeamId: 'cod', homeGoals: null, awayGoals: null, dateUTC: '2026-06-24T02:00:00Z', stadiumId: 'akron', status: 'scheduled', matchNumber: 48 },

  // ─────────────────────────────────────────────────────────────
  // FASE DE GRUPOS — RODADA 3 (24–27 jun) — jogos simultâneos
  // ─────────────────────────────────────────────────────────────
  { id: 'gs-049', stage: 'group', group: 'B', matchday: 3, homeTeamId: 'sui', awayTeamId: 'can', homeGoals: null, awayGoals: null, dateUTC: '2026-06-24T19:00:00Z', stadiumId: 'bc-place', status: 'scheduled', matchNumber: 49 },
  { id: 'gs-050', stage: 'group', group: 'B', matchday: 3, homeTeamId: 'bih', awayTeamId: 'qat', homeGoals: null, awayGoals: null, dateUTC: '2026-06-24T19:00:00Z', stadiumId: 'lumen', status: 'scheduled', matchNumber: 50 },
  { id: 'gs-051', stage: 'group', group: 'C', matchday: 3, homeTeamId: 'sco', awayTeamId: 'bra', homeGoals: null, awayGoals: null, dateUTC: '2026-06-24T22:00:00Z', stadiumId: 'hard-rock', status: 'scheduled', matchNumber: 51 },
  { id: 'gs-052', stage: 'group', group: 'C', matchday: 3, homeTeamId: 'mar', awayTeamId: 'hai', homeGoals: null, awayGoals: null, dateUTC: '2026-06-24T22:00:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 52 },
  { id: 'gs-053', stage: 'group', group: 'A', matchday: 3, homeTeamId: 'cze', awayTeamId: 'mex', homeGoals: null, awayGoals: null, dateUTC: '2026-06-25T01:00:00Z', stadiumId: 'azteca', status: 'scheduled', matchNumber: 53 },
  { id: 'gs-054', stage: 'group', group: 'A', matchday: 3, homeTeamId: 'rsa', awayTeamId: 'kor', homeGoals: null, awayGoals: null, dateUTC: '2026-06-25T01:00:00Z', stadiumId: 'bbva', status: 'scheduled', matchNumber: 54 },
  { id: 'gs-055', stage: 'group', group: 'E', matchday: 3, homeTeamId: 'cuw', awayTeamId: 'civ', homeGoals: null, awayGoals: null, dateUTC: '2026-06-25T20:00:00Z', stadiumId: 'lincoln-financial', status: 'scheduled', matchNumber: 55 },
  { id: 'gs-056', stage: 'group', group: 'E', matchday: 3, homeTeamId: 'ecu', awayTeamId: 'ger', homeGoals: null, awayGoals: null, dateUTC: '2026-06-25T20:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 56 },
  { id: 'gs-057', stage: 'group', group: 'F', matchday: 3, homeTeamId: 'jpn', awayTeamId: 'swe', homeGoals: null, awayGoals: null, dateUTC: '2026-06-25T23:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 57 },
  { id: 'gs-058', stage: 'group', group: 'F', matchday: 3, homeTeamId: 'tun', awayTeamId: 'ned', homeGoals: null, awayGoals: null, dateUTC: '2026-06-25T23:00:00Z', stadiumId: 'arrowhead', status: 'scheduled', matchNumber: 58 },
  { id: 'gs-059', stage: 'group', group: 'D', matchday: 3, homeTeamId: 'tur', awayTeamId: 'usa', homeGoals: null, awayGoals: null, dateUTC: '2026-06-26T02:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 59 },
  { id: 'gs-060', stage: 'group', group: 'D', matchday: 3, homeTeamId: 'par', awayTeamId: 'aus', homeGoals: null, awayGoals: null, dateUTC: '2026-06-26T02:00:00Z', stadiumId: 'levis', status: 'scheduled', matchNumber: 60 },
  { id: 'gs-061', stage: 'group', group: 'I', matchday: 3, homeTeamId: 'nor', awayTeamId: 'fra', homeGoals: null, awayGoals: null, dateUTC: '2026-06-26T19:00:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 61 },
  { id: 'gs-062', stage: 'group', group: 'I', matchday: 3, homeTeamId: 'sen', awayTeamId: 'irq', homeGoals: null, awayGoals: null, dateUTC: '2026-06-26T19:00:00Z', stadiumId: 'bmo-field', status: 'scheduled', matchNumber: 62 },
  { id: 'gs-063', stage: 'group', group: 'H', matchday: 3, homeTeamId: 'cpv', awayTeamId: 'ksa', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T00:00:00Z', stadiumId: 'nrg', status: 'scheduled', matchNumber: 63 },
  { id: 'gs-064', stage: 'group', group: 'H', matchday: 3, homeTeamId: 'uru', awayTeamId: 'esp', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T00:00:00Z', stadiumId: 'bbva', status: 'scheduled', matchNumber: 64 },
  { id: 'gs-065', stage: 'group', group: 'G', matchday: 3, homeTeamId: 'egy', awayTeamId: 'irn', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T03:00:00Z', stadiumId: 'lumen', status: 'scheduled', matchNumber: 65 },
  { id: 'gs-066', stage: 'group', group: 'G', matchday: 3, homeTeamId: 'nzl', awayTeamId: 'bel', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T03:00:00Z', stadiumId: 'bc-place', status: 'scheduled', matchNumber: 66 },
  { id: 'gs-067', stage: 'group', group: 'L', matchday: 3, homeTeamId: 'pan', awayTeamId: 'eng', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T21:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 67 },
  { id: 'gs-068', stage: 'group', group: 'L', matchday: 3, homeTeamId: 'cro', awayTeamId: 'gha', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T21:00:00Z', stadiumId: 'lincoln-financial', status: 'scheduled', matchNumber: 68 },
  { id: 'gs-069', stage: 'group', group: 'K', matchday: 3, homeTeamId: 'col', awayTeamId: 'por', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T23:30:00Z', stadiumId: 'hard-rock', status: 'scheduled', matchNumber: 69 },
  { id: 'gs-070', stage: 'group', group: 'K', matchday: 3, homeTeamId: 'cod', awayTeamId: 'uzb', homeGoals: null, awayGoals: null, dateUTC: '2026-06-27T23:30:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 70 },
  { id: 'gs-071', stage: 'group', group: 'J', matchday: 3, homeTeamId: 'alg', awayTeamId: 'aut', homeGoals: null, awayGoals: null, dateUTC: '2026-06-28T02:00:00Z', stadiumId: 'arrowhead', status: 'scheduled', matchNumber: 71 },
  { id: 'gs-072', stage: 'group', group: 'J', matchday: 3, homeTeamId: 'jor', awayTeamId: 'arg', homeGoals: null, awayGoals: null, dateUTC: '2026-06-28T02:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 72 },

  // ─────────────────────────────────────────────────────────────
  // 16-AVOS DE FINAL — Round of 32 (28 jun – 3 jul)
  // Seleções confirmadas após o término da fase de grupos (chaveamento
  // oficial FIFA). Os placeholders permanecem como referência da vaga.
  // ─────────────────────────────────────────────────────────────
  { id: 'ko-073', stage: 'round-of-32', homeTeamId: 'rsa', awayTeamId: 'can', homeTeamPlaceholder: '2º do Grupo A', awayTeamPlaceholder: '2º do Grupo B', homeGoals: null, awayGoals: null, dateUTC: '2026-06-28T19:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 73 },
  { id: 'ko-074', stage: 'round-of-32', homeTeamId: 'ger', awayTeamId: 'par', homeTeamPlaceholder: '1º do Grupo E', awayTeamPlaceholder: 'Melhor 3º de A, B, C, D, F', homeGoals: null, awayGoals: null, dateUTC: '2026-06-29T20:30:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 74 },
  { id: 'ko-075', stage: 'round-of-32', homeTeamId: 'ned', awayTeamId: 'mar', homeTeamPlaceholder: '1º do Grupo F', awayTeamPlaceholder: '2º do Grupo C', homeGoals: null, awayGoals: null, dateUTC: '2026-06-30T01:00:00Z', stadiumId: 'bbva', status: 'scheduled', matchNumber: 75 },
  { id: 'ko-076', stage: 'round-of-32', homeTeamId: 'bra', awayTeamId: 'jpn', homeTeamPlaceholder: '1º do Grupo C', awayTeamPlaceholder: '2º do Grupo F', homeGoals: null, awayGoals: null, dateUTC: '2026-06-29T17:00:00Z', stadiumId: 'nrg', status: 'scheduled', matchNumber: 76 },
  { id: 'ko-077', stage: 'round-of-32', homeTeamId: 'fra', awayTeamId: 'swe', homeTeamPlaceholder: '1º do Grupo I', awayTeamPlaceholder: 'Melhor 3º de C, D, F, G, H', homeGoals: null, awayGoals: null, dateUTC: '2026-06-30T21:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 77 },
  { id: 'ko-078', stage: 'round-of-32', homeTeamId: 'civ', awayTeamId: 'nor', homeTeamPlaceholder: '2º do Grupo E', awayTeamPlaceholder: '2º do Grupo I', homeGoals: null, awayGoals: null, dateUTC: '2026-06-30T17:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 78 },
  { id: 'ko-079', stage: 'round-of-32', homeTeamId: 'mex', awayTeamId: 'ecu', homeTeamPlaceholder: '1º do Grupo A', awayTeamPlaceholder: 'Melhor 3º de C, E, F, H, I', homeGoals: null, awayGoals: null, dateUTC: '2026-07-01T01:00:00Z', stadiumId: 'azteca', status: 'scheduled', matchNumber: 79 },
  { id: 'ko-080', stage: 'round-of-32', homeTeamId: 'eng', awayTeamId: 'cod', homeTeamPlaceholder: '1º do Grupo L', awayTeamPlaceholder: 'Melhor 3º de E, H, I, J, K', homeGoals: null, awayGoals: null, dateUTC: '2026-07-01T16:00:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 80 },
  { id: 'ko-081', stage: 'round-of-32', homeTeamId: 'usa', awayTeamId: 'bih', homeTeamPlaceholder: '1º do Grupo D', awayTeamPlaceholder: 'Melhor 3º de B, E, F, I, J', homeGoals: null, awayGoals: null, dateUTC: '2026-07-02T00:00:00Z', stadiumId: 'levis', status: 'scheduled', matchNumber: 81 },
  { id: 'ko-082', stage: 'round-of-32', homeTeamId: 'bel', awayTeamId: 'sen', homeTeamPlaceholder: '1º do Grupo G', awayTeamPlaceholder: 'Melhor 3º de A, E, H, I, J', homeGoals: null, awayGoals: null, dateUTC: '2026-07-01T20:00:00Z', stadiumId: 'lumen', status: 'scheduled', matchNumber: 82 },
  { id: 'ko-083', stage: 'round-of-32', homeTeamId: 'por', awayTeamId: 'cro', homeTeamPlaceholder: '2º do Grupo K', awayTeamPlaceholder: '2º do Grupo L', homeGoals: null, awayGoals: null, dateUTC: '2026-07-02T23:00:00Z', stadiumId: 'bmo-field', status: 'scheduled', matchNumber: 83 },
  { id: 'ko-084', stage: 'round-of-32', homeTeamId: 'esp', awayTeamId: 'aut', homeTeamPlaceholder: '1º do Grupo H', awayTeamPlaceholder: '2º do Grupo J', homeGoals: null, awayGoals: null, dateUTC: '2026-07-02T19:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 84 },
  { id: 'ko-085', stage: 'round-of-32', homeTeamId: 'sui', awayTeamId: 'alg', homeTeamPlaceholder: '1º do Grupo B', awayTeamPlaceholder: 'Melhor 3º de E, F, G, I, J', homeGoals: null, awayGoals: null, dateUTC: '2026-07-03T03:00:00Z', stadiumId: 'bc-place', status: 'scheduled', matchNumber: 85 },
  { id: 'ko-086', stage: 'round-of-32', homeTeamId: 'arg', awayTeamId: 'cpv', homeTeamPlaceholder: '1º do Grupo J', awayTeamPlaceholder: '2º do Grupo H', homeGoals: null, awayGoals: null, dateUTC: '2026-07-03T22:00:00Z', stadiumId: 'hard-rock', status: 'scheduled', matchNumber: 86 },
  { id: 'ko-087', stage: 'round-of-32', homeTeamId: 'col', awayTeamId: 'gha', homeTeamPlaceholder: '1º do Grupo K', awayTeamPlaceholder: 'Melhor 3º de D, E, I, J, L', homeGoals: null, awayGoals: null, dateUTC: '2026-07-04T01:30:00Z', stadiumId: 'arrowhead', status: 'scheduled', matchNumber: 87 },
  { id: 'ko-088', stage: 'round-of-32', homeTeamId: 'aus', awayTeamId: 'egy', homeTeamPlaceholder: '2º do Grupo D', awayTeamPlaceholder: '2º do Grupo G', homeGoals: null, awayGoals: null, dateUTC: '2026-07-03T18:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 88 },

  // ─────────────────────────────────────────────────────────────
  // OITAVAS DE FINAL — Round of 16 (4–7 jul)
  // ─────────────────────────────────────────────────────────────
  { id: 'ko-089', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 74', awayTeamPlaceholder: 'Vencedor do Jogo 77', homeGoals: null, awayGoals: null, dateUTC: '2026-07-04T17:00:00Z', stadiumId: 'nrg', status: 'scheduled', matchNumber: 89 },
  { id: 'ko-090', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 73', awayTeamPlaceholder: 'Vencedor do Jogo 75', homeGoals: null, awayGoals: null, dateUTC: '2026-07-04T21:00:00Z', stadiumId: 'lincoln-financial', status: 'scheduled', matchNumber: 90 },
  { id: 'ko-091', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 76', awayTeamPlaceholder: 'Vencedor do Jogo 78', homeGoals: null, awayGoals: null, dateUTC: '2026-07-05T20:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 91 },
  { id: 'ko-092', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 79', awayTeamPlaceholder: 'Vencedor do Jogo 80', homeGoals: null, awayGoals: null, dateUTC: '2026-07-06T00:00:00Z', stadiumId: 'azteca', status: 'scheduled', matchNumber: 92 },
  { id: 'ko-093', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 83', awayTeamPlaceholder: 'Vencedor do Jogo 84', homeGoals: null, awayGoals: null, dateUTC: '2026-07-06T19:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 93 },
  { id: 'ko-094', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 81', awayTeamPlaceholder: 'Vencedor do Jogo 82', homeGoals: null, awayGoals: null, dateUTC: '2026-07-07T00:00:00Z', stadiumId: 'lumen', status: 'scheduled', matchNumber: 94 },
  { id: 'ko-095', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 86', awayTeamPlaceholder: 'Vencedor do Jogo 88', homeGoals: null, awayGoals: null, dateUTC: '2026-07-07T16:00:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 95 },
  { id: 'ko-096', stage: 'round-of-16', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 85', awayTeamPlaceholder: 'Vencedor do Jogo 87', homeGoals: null, awayGoals: null, dateUTC: '2026-07-07T20:00:00Z', stadiumId: 'bc-place', status: 'scheduled', matchNumber: 96 },

  // ─────────────────────────────────────────────────────────────
  // QUARTAS DE FINAL (9–11 jul)
  // ─────────────────────────────────────────────────────────────
  { id: 'ko-097', stage: 'quarter-final', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 89', awayTeamPlaceholder: 'Vencedor do Jogo 90', homeGoals: null, awayGoals: null, dateUTC: '2026-07-09T20:00:00Z', stadiumId: 'gillette', status: 'scheduled', matchNumber: 97 },
  { id: 'ko-098', stage: 'quarter-final', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 93', awayTeamPlaceholder: 'Vencedor do Jogo 94', homeGoals: null, awayGoals: null, dateUTC: '2026-07-10T19:00:00Z', stadiumId: 'sofi', status: 'scheduled', matchNumber: 98 },
  { id: 'ko-099', stage: 'quarter-final', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 91', awayTeamPlaceholder: 'Vencedor do Jogo 92', homeGoals: null, awayGoals: null, dateUTC: '2026-07-11T21:00:00Z', stadiumId: 'hard-rock', status: 'scheduled', matchNumber: 99 },
  { id: 'ko-100', stage: 'quarter-final', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 95', awayTeamPlaceholder: 'Vencedor do Jogo 96', homeGoals: null, awayGoals: null, dateUTC: '2026-07-12T01:00:00Z', stadiumId: 'arrowhead', status: 'scheduled', matchNumber: 100 },

  // ─────────────────────────────────────────────────────────────
  // SEMIFINAIS (14–15 jul)
  // ─────────────────────────────────────────────────────────────
  { id: 'ko-101', stage: 'semi-final', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 97', awayTeamPlaceholder: 'Vencedor do Jogo 98', homeGoals: null, awayGoals: null, dateUTC: '2026-07-14T19:00:00Z', stadiumId: 'att', status: 'scheduled', matchNumber: 101 },
  { id: 'ko-102', stage: 'semi-final', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 99', awayTeamPlaceholder: 'Vencedor do Jogo 100', homeGoals: null, awayGoals: null, dateUTC: '2026-07-15T19:00:00Z', stadiumId: 'mercedes-benz', status: 'scheduled', matchNumber: 102 },

  // ─────────────────────────────────────────────────────────────
  // DISPUTA DE 3º LUGAR (18 jul) e FINAL (19 jul)
  // ─────────────────────────────────────────────────────────────
  { id: 'ko-103', stage: 'third-place', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Perdedor do Jogo 101', awayTeamPlaceholder: 'Perdedor do Jogo 102', homeGoals: null, awayGoals: null, dateUTC: '2026-07-18T21:00:00Z', stadiumId: 'hard-rock', status: 'scheduled', matchNumber: 103 },
  { id: 'ko-104', stage: 'final', homeTeamId: null, awayTeamId: null, homeTeamPlaceholder: 'Vencedor do Jogo 101', awayTeamPlaceholder: 'Vencedor do Jogo 102', homeGoals: null, awayGoals: null, dateUTC: '2026-07-19T19:00:00Z', stadiumId: 'metlife', status: 'scheduled', matchNumber: 104 },
];

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

export function getMatchesByGroup(group: GroupId): Match[] {
  return matches.filter((m) => m.group === group);
}

export function getMatchesByStage(stage: MatchStage): Match[] {
  return matches.filter((m) => m.stage === stage);
}

export function getMatchesByTeam(teamId: string): Match[] {
  return matches.filter(
    (m) => m.homeTeamId === teamId || m.awayTeamId === teamId,
  );
}

export function getMatchesByDate(date: string): Match[] {
  return matches.filter((m) => m.dateUTC.startsWith(date));
}

export function getMatchByNumber(matchNumber: number): Match | undefined {
  return matches.find((m) => m.matchNumber === matchNumber);
}
