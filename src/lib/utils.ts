import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Data inválida'
  
  const validDate = new Date(date)
  
  // Verificar se a data é válida
  if (isNaN(validDate.getTime())) {
    return 'Data inválida'
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(validDate)
}

export function getLeadStatusColor(status: string): string {
  switch (status) {
    case 'hot':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'warm':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'cold':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'descarte':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function calculateLeadScore(lead: any): number {
  let score = 0
  
  if (lead.hasPrecatorio) score += 50
  if (lead.isEligible) score += 25
  if (lead.urgency === 'high') score += 15
  if (lead.documentsUploaded) score += 10
  
  return score
}

export function getLeadClassification(score: number): 'hot' | 'warm' | 'cold' | 'descarte' {
  if (score >= 80) return 'hot'
  if (score >= 50) return 'warm'
  if (score >= 20) return 'cold'
  return 'descarte'
}