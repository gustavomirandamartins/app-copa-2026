/**
 * Geração do "Pix copia e cola" (BR Code / padrão EMV do Banco Central)
 * para pagamento manual. SERVER-ONLY: lê variáveis de ambiente com a chave
 * Pix do recebedor e monta o payload assinado com CRC16-CCITT.
 *
 * Variáveis de ambiente:
 *   PIX_KEY            chave Pix do recebedor (e-mail, CPF/CNPJ, telefone ou aleatória)
 *   PIX_MERCHANT_NAME  nome do recebedor (máx. 25 caracteres)
 *   PIX_MERCHANT_CITY  cidade do recebedor (máx. 15 caracteres)
 *   PIX_RECEIPT_EMAIL  e-mail para o cliente enviar o comprovante
 */

export interface PixConfig {
  key: string;
  merchantName: string;
  merchantCity: string;
  receiptEmail: string;
}

/** Lê a configuração do Pix do ambiente. Retorna null se não configurada. */
export function getPixConfig(): PixConfig | null {
  const key = process.env.PIX_KEY?.trim();
  if (!key) return null;
  return {
    key,
    merchantName: (process.env.PIX_MERCHANT_NAME ?? 'MINDUBIER').trim(),
    merchantCity: (process.env.PIX_MERCHANT_CITY ?? 'BRASIL').trim(),
    receiptEmail: (process.env.PIX_RECEIPT_EMAIL ?? '').trim(),
  };
}

/** Remove acentos e caracteres fora do ASCII imprimível (exigência do BR Code). */
function sanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .toUpperCase();
}

/** Monta um campo EMV: id + comprimento (2 dígitos) + valor. */
function field(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) em hexa maiúsculo. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o "Pix copia e cola" estático para um valor fixo.
 * @param amountCents valor em centavos (ex.: 3990 → R$ 39,90)
 * @param txid identificador da transação (opcional; até 25 chars)
 */
export function buildPixCopiaECola(
  config: PixConfig,
  amountCents: number,
  txid?: string,
): string {
  const merchantAccount = field(
    '26',
    field('00', 'br.gov.bcb.pix') + field('01', config.key),
  );

  const amount = (amountCents / 100).toFixed(2);
  const name = sanitize(config.merchantName).slice(0, 25);
  const city = sanitize(config.merchantCity).slice(0, 15);
  const reference = txid ? sanitize(txid).slice(0, 25) : '***';
  const additionalData = field('62', field('05', reference));

  const partial =
    field('00', '01') + // Payload Format Indicator
    field('01', '11') + // Point of Initiation Method (estático/reutilizável)
    merchantAccount +
    field('52', '0000') + // Merchant Category Code
    field('53', '986') + // Moeda: BRL
    field('54', amount) +
    field('58', 'BR') + // País
    field('59', name) +
    field('60', city) +
    additionalData +
    '6304'; // id + len do CRC, antes de calculá-lo

  return partial + crc16(partial);
}
