export interface User {
  _id?: string
  name: string
  email: string
  password?: string
  role: 'admin' | 'user'
  phone?: string
  avatar?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface Lead {
  _id?: string
  name: string
  phone: string
  email?: string
  cpf?: string
  whatsappId: string
  status: 'new' | 'qualified' | 'in_analysis' | 'proposal' | 'closed_won' | 'closed_lost'
  classification: 'hot' | 'warm' | 'cold' | 'discard'
  score: number
  hasPrecatorio?: boolean
  precatorioValue?: number
  precatorioType?: string
  state?: string
  city?: string
  isEligible?: boolean
  urgency?: 'low' | 'medium' | 'high'
  documentsUploaded?: boolean
  assignedTo?: string
  source: string
  notes?: string
  tags?: string[]
  createdAt?: Date
  updatedAt?: Date
  lastInteraction?: Date
  escavadorData?: {
    consultedAt: Date
    processosEncontrados: number
    ultimaConsulta: Date
    processos: Array<{
      numeroProcesso: string
      tribunal: string
      valor?: number
      status?: string
      dataInicio?: Date
      ultimaMovimentacao?: Date
      tipo?: string
      assunto?: string
      partes?: {
        ativo?: string
        passivo?: string
      }
    }>
    totalValue?: number
    hasEligibleProcessos?: boolean
  }
}

export interface Conversation {
  _id?: string
  leadId: string
  whatsappId: string
  status: 'active' | 'paused' | 'completed' | 'transferred'
  messages: Message[]
  botActive: boolean
  assignedAgent?: string
  metadata?: {
    lastBotResponse?: Date
    transferReason?: string
    qualificationData?: any
    priority?: 'low' | 'medium' | 'high'
    transferredAt?: Date
    transferredBy?: string
    assignedAgentId?: string
    assignedAt?: Date
    assignedBy?: string
    pausedAt?: Date
    pausedBy?: string
    pauseReason?: string
    resumedAt?: Date
    resumedBy?: string
    removedFromQueueBy?: string
    removedFromQueueAt?: Date
    priorityChangedBy?: string
    priorityChangedAt?: Date
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface Message {
  _id?: string
  conversationId: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  content: string
  sender: 'user' | 'bot' | 'agent'
  senderName?: string
  timestamp: Date
  read?: boolean
  metadata?: {
    messageId?: string
    quotedMessage?: string
    mediaUrl?: string
    fileName?: string
    mimetype?: string
    transcription?: string // Para áudios transcritos
  }
}

export interface BotConfig {
  _id?: string
  isActive: boolean
  workingHours: {
    start: string
    end: string
    timezone: string
  }
  prompts: {
    welcome: string
    qualification: string
    followUp: string
    transfer: string
  }
  eligibilityRules: {
    allowedStates: string[]
    minValue?: number
    maxValue?: number
    allowedTypes: string[]
  }
  responseTemplates: {
    [key: string]: string
  }
  transferRules: {
    scoreThreshold: number
    keywordTriggers: string[]
    maxBotResponses: number
  }
  aiConfig?: {
    enabled: boolean
    provider: string
    apiKey?: string
    analysisModel?: string
    responseModel?: string
    prompts: {
      extraction: string
      scoring: string
      response: string
      transfer: string
    }
    settings: {
      autoExtraction: boolean
      autoScoring: boolean
      autoTransfer: boolean
      temperature: number
      maxTokens: number
      messageGroupingDelay?: number
      maxMessagesToGroup?: number
    }
  }
  mediaProcessing?: {
    enabled?: boolean
    googleVision?: {
      enabled?: boolean
      keyPath?: string
      credentialsUploaded?: boolean
    }
    groq?: {
      enabled?: boolean
      apiKey?: string
    }
    openRouter?: {
      enabled?: boolean
      apiKey?: string
      imageModel?: string
    }
  }
  escavadorConfig?: {
    enabled?: boolean
    apiKey?: string
    cacheHours?: number
    maxProcessos?: number
  }
  bitrixConfig?: {
    scoreThreshold?: number
  }
  updatedAt?: Date
  updatedBy?: string
}

export interface Activity {
  _id?: string
  leadId: string
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'task' | 'note'
  title: string
  description?: string
  status: 'pending' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  dueDate?: Date
  assignedTo: string
  createdBy: string
  createdAt?: Date
  completedAt?: Date
}

export interface Dashboard {
  totalLeads: number
  activeConversations: number
  hotLeads: number
  conversionRate: number
  averageResponseTime: number
  todayStats: {
    newLeads: number
    messages: number
    qualifiedLeads: number
  }
  chartData: {
    leadsOverTime: { date: string; leads: number }[]
    conversionFunnel: { stage: string; count: number }[]
    scoreDistribution: { range: string; count: number }[]
  }
}

// Logs de IA e Sistema
export interface AILog {
  _id?: string
  leadId: string
  type: 'extraction' | 'scoring' | 'transfer_decision' | 'response_generation' | 'escavador_query'
  action: string
  input: any
  output: any
  reasoning?: string
  confidence?: number
  model?: string
  timestamp: Date
  executionTime?: number
  metadata?: {
    conversationId?: string
    messageId?: string
    extractedFields?: string[]
    previousScore?: number
    newScore?: number
    transferReason?: string
  }
}

// Logs de Transferência
export interface TransferLog {
  _id?: string
  leadId: string
  fromStatus: string
  toStatus: string
  reason: string
  triggeredBy: 'ai' | 'human' | 'system'
  agent?: string
  notes?: string
  timestamp: Date
  metadata?: {
    score?: number
    classification?: string
    conversationId?: string
    isFirstAITransfer?: boolean
    bitrixSent?: boolean
    bitrixDealId?: string
    bitrixSentAt?: Date
    bitrixSentBy?: string
    bitrixError?: string
  }
}

// Logs de Pontuação
export interface ScoreLog {
  _id?: string
  leadId: string
  previousScore: number
  newScore: number
  previousClassification: string
  newClassification: string
  reason: string
  factors: {
    factor: string
    points: number
    description?: string
  }[]
  triggeredBy: 'ai' | 'manual' | 'escavador'
  timestamp: Date
  metadata?: {
    conversationId?: string
    escavadorData?: boolean
  }
}

// Resumo Detalhado do Lead
export interface LeadSummary {
  _id?: string
  leadId: string
  summary: string
  keyPoints: string[]
  concerns: string[]
  opportunities: string[]
  nextSteps: string[]
  generatedBy: 'ai' | 'human'
  lastUpdated: Date
  metadata?: {
    totalInteractions: number
    avgResponseTime: number
    engagementLevel: 'low' | 'medium' | 'high'
  }
}