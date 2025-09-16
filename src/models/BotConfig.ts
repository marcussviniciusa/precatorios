import { Schema, model, models } from 'mongoose'
import type { BotConfig } from '@/types'

const BotConfigSchema = new Schema<BotConfig>({
  isActive: { type: Boolean, default: true },
  workingHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' },
    timezone: { type: String, default: 'America/Sao_Paulo' }
  },
  prompts: {
    welcome: { 
      type: String, 
      default: 'Olá! 👋 Sou o assistente virtual especializado em precatórios. Como posso ajudá-lo hoje?' 
    },
    qualification: { 
      type: String,
      default: 'Para melhor atendê-lo, preciso de algumas informações. Você possui algum precatório para receber?' 
    },
    followUp: { 
      type: String,
      default: 'Obrigado pelas informações! Em breve um de nossos especialistas entrará em contato.' 
    },
    transfer: { 
      type: String,
      default: 'Vou transferir você para um de nossos especialistas. Aguarde um momento...' 
    }
  },
  eligibilityRules: {
    allowedStates: {
      type: [String],
      default: ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'DF', 'ES']
    },
    minValue: { type: Number, default: 10000 },
    maxValue: Number,
    allowedTypes: {
      type: [String],
      default: ['federal', 'estadual', 'municipal', 'trabalhista']
    }
  },
  responseTemplates: {
    type: Schema.Types.Mixed,
    default: {
      greeting: 'Olá! Como posso ajudá-lo com seus precatórios?',
      not_eligible: 'Infelizmente seu precatório não se enquadra em nossos critérios no momento.',
      eligible: 'Ótima notícia! Seu precatório está dentro de nossos critérios de atendimento.',
      need_documents: 'Para prosseguir, precisarei que envie alguns documentos.',
      outside_hours: 'Nosso atendimento funciona das 8h às 18h. Retornarei seu contato no próximo horário comercial.'
    }
  },
  transferRules: {
    scoreThreshold: { type: Number, default: 60 },
    keywordTriggers: {
      type: [String],
      default: ['falar com humano', 'quero falar com alguém', 'atendente', 'urgente']
    },
    maxBotResponses: { type: Number, default: 10 }
  },
  aiConfig: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: 'openrouter' },
    apiKey: String,
    analysisModel: String,
    responseModel: String,
    prompts: {
      extraction: {
        type: String,
        default: 'Extraia informações sobre precatórios da mensagem: nome, valor, estado, urgência, tipo.'
      },
      scoring: {
        type: String,
        default: 'Calcule o score do lead baseado nas informações: precatório confirmado (+40), valor elegível (+20), estado válido (+10), urgência (+15), documentos (+10), interesse (+5).'
      },
      response: {
        type: String,
        default: `Você é um assistente virtual especializado em precatórios do governo.
Seu objetivo é:
1. Ser cordial e profissional
2. Identificar se a pessoa tem precatórios
3. Coletar informações básicas (valor, estado, tipo)
4. Explicar o processo de forma simples
5. Qualificar o lead para possível venda

Regras importantes:
- Seja direto e objetivo
- Use linguagem simples e acessível
- Máximo de 3 linhas por resposta
- Se o valor for menor que R$ 10.000, explique que não trabalhamos com valores baixos
- Estados atendidos: SP, RJ, MG, RS, PR, SC, BA, GO, DF, ES
- Sempre pergunte uma coisa por vez
- Se a pessoa demonstrar urgência, indique que um especialista entrará em contato`
      },
      transfer: {
        type: String,
        default: 'Decida se deve transferir para humano baseado no score (>=60), urgência, solicitação explícita ou mais de 5 mensagens.'
      }
    },
    settings: {
      autoExtraction: { type: Boolean, default: true },
      autoScoring: { type: Boolean, default: true },
      autoTransfer: { type: Boolean, default: true },
      temperature: { type: Number, default: 0.3 },
      maxTokens: { type: Number, default: 500 },
      messageGroupingDelay: { type: Number, default: 3000 },
      maxMessagesToGroup: { type: Number, default: 5 }
    }
  },
  mediaProcessing: {
    enabled: { type: Boolean, default: false },
    googleVision: {
      enabled: { type: Boolean, default: false },
      keyPath: { type: String, default: './google-vision-key.json' }
    },
    groq: {
      enabled: { type: Boolean, default: false },
      apiKey: String
    },
    openRouter: {
      enabled: { type: Boolean, default: true },
      apiKey: String,
      imageModel: { type: String, default: 'openrouter/sonoma-sky-alpha' }
    }
  },
  escavadorConfig: {
    enabled: { type: Boolean, default: false },
    apiKey: String,
    cacheHours: { type: Number, default: 24 },
    maxProcessos: { type: Number, default: 10 }
  },
  updatedBy: { type: String, ref: 'User' }
}, {
  timestamps: true
})

BotConfigSchema.index({ updatedAt: -1 })

export default models.BotConfig || model<BotConfig>('BotConfig', BotConfigSchema)