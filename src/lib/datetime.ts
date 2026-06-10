/**
 * Formatação de datas/horários dos jogos SEMPRE em horário de Brasília
 * (America/Sao_Paulo), independente do fuso da máquina de quem acessa.
 * Os jogos são armazenados em UTC (dateUTC); aqui convertemos para BRT.
 */

const BRASILIA_TZ = 'America/Sao_Paulo';

/** Ex.: "16:00" (horário de Brasília). */
export function formatKickoffTime(dateUTC: string): string {
  return new Date(dateUTC).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BRASILIA_TZ,
  });
}

/** Ex.: "quinta-feira, 11 de junho de 2026" (em Brasília). */
export function formatKickoffDate(
  dateUTC: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  return new Date(dateUTC).toLocaleDateString('pt-BR', {
    ...options,
    timeZone: BRASILIA_TZ,
  });
}
