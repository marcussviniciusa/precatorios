/**
 * Extrai o número de telefone do ownerJid do WhatsApp
 * @param ownerJid - JID do proprietário (ex: "5584991516506@s.whatsapp.net")
 * @returns Número do telefone limpo ou null se inválido
 */
export function extractPhoneFromJid(ownerJid?: string): string | null {
  if (!ownerJid) return null
  
  // Remover @s.whatsapp.net e outros sufixos
  const phone = ownerJid.replace(/@.*$/, '')
  
  // Validar se é um número válido (apenas dígitos, 10-15 caracteres)
  if (!/^\d{10,15}$/.test(phone)) {
    return null
  }
  
  return phone
}

/**
 * Formatar número de telefone para exibição
 * @param phone - Número do telefone
 * @returns Número formatado para exibição
 */
export function formatPhoneForDisplay(phone?: string): string {
  if (!phone) return 'Não conectado'
  
  // Formato brasileiro: +55 (84) 99999-9999
  if (phone.startsWith('55') && phone.length >= 12) {
    const ddd = phone.substring(2, 4)
    const number = phone.substring(4)
    
    if (number.length === 9) {
      return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`
    } else if (number.length === 8) {
      return `+55 (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`
    }
  }
  
  // Fallback: formato internacional simples
  return `+${phone}`
}

/**
 * Verificar se dois números são o mesmo (considerando formatos diferentes)
 * @param phone1 - Primeiro número
 * @param phone2 - Segundo número
 * @returns true se são o mesmo número
 */
export function arePhoneNumbersEqual(phone1?: string, phone2?: string): boolean {
  if (!phone1 || !phone2) return false
  
  // Remover todos os caracteres não numéricos
  const clean1 = phone1.replace(/\D/g, '')
  const clean2 = phone2.replace(/\D/g, '')
  
  return clean1 === clean2
}