export interface User {
  _id?: string
  name: string
  email: string
  password?: string
  role: 'admin' | 'manager' | 'analyst'
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
  whatsappId: string
  status: 'new' | 'qualified' | 'in_analysis' | 'proposal' | 'closed_won' | 'closed_lost'
  classification: 'hot' | 'warm' | 'cold' | 'descarte'
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
  metadata?: {
    messageId?: string
    quotedMessage?: string
    mediaUrl?: string
    fileName?: string
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