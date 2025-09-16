import dbConnect from '@/lib/mongodb'
import BotConfig from '@/models/BotConfig'

interface ExtractedInfo {
  name?: string
  phone?: string
  cpf?: string
  hasPrecatorio?: boolean
  precatorioValue?: number
  state?: string
  city?: string
  urgency?: 'low' | 'medium' | 'high'
  documentType?: string
  precatorioType?: string
  isEligible?: boolean
  escavadorData?: any
}

interface ScoreResult {
  score: number
  classification: 'hot' | 'warm' | 'cold' | 'discard'
  reasoning: string
}

interface TransferDecision {
  shouldTransfer: boolean
  reason?: string
  priority?: 'low' | 'medium' | 'high'
}

export class PrecatoriosAI {
  private apiKey: string
  private analysisModel: string
  private responseModel: string
  private settings: any
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions'

  constructor(apiKey: string, analysisModel: string, responseModel: string, settings: any) {
    this.apiKey = apiKey
    this.analysisModel = analysisModel
    this.responseModel = responseModel
    this.settings = settings
  }

  private cleanJsonResponse(response: string): string {
    // Extrair JSON da resposta (pode vir com texto adicional)
    let jsonStr = response
    
    // Se contém ```json, extrair apenas o JSON
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    } else {
      // Tentar encontrar JSON no meio do texto
      const jsonStart = jsonStr.indexOf('{')
      const jsonEnd = jsonStr.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1)
      }
    }
    
    return jsonStr.trim()
  }

  private async callOpenRouter(prompt: string, systemPrompt: string, model: string): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'Precatorios Bot'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: this.settings?.temperature || 0.3,
          max_tokens: this.settings?.maxTokens || 500
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter API error:', response.status, errorText)
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('OpenRouter response:', JSON.stringify(data, null, 2))
      return data.choices[0].message.content
    } catch (error) {
      console.error('Error calling OpenRouter:', error)
      throw error
    }
  }

  async extractLeadInfo(message: string, previousContext?: string): Promise<ExtractedInfo> {
    const systemPrompt = `Você é um assistente especializado em extrair informações sobre precatórios de mensagens de WhatsApp.
    Extraia as seguintes informações quando disponíveis:
    - Nome da pessoa
    - Telefone
    - Se possui precatório (sim/não)
    - Valor do precatório (número)
    - Estado (sigla)
    - Cidade
    - Urgência (baixa/média/alta)
    - Tipo de documento
    - Tipo de precatório (federal/estadual/municipal/trabalhista)
    - Se é elegível baseado em: valor > 10000 e estado permitido (SP, RJ, MG, RS, PR, SC, BA, GO, DF, ES)
    
    Retorne APENAS um JSON válido com os campos encontrados. Campos não encontrados devem ser omitidos.`

    const prompt = `Contexto anterior: ${previousContext || 'Nenhum'}
    
    Mensagem atual: ${message}
    
    Extraia as informações em formato JSON.`

    try {
      const response = await this.callOpenRouter(prompt, systemPrompt, this.analysisModel)
      const cleanJson = this.cleanJsonResponse(response)
      return JSON.parse(cleanJson)
    } catch (error) {
      console.error('Error extracting lead info:', error)
      return {}
    }
  }

  async calculateScore(leadData: any, conversationHistory: string, escavadorEnabled: boolean = true): Promise<ScoreResult> {
    // Adicionar informações do Escavador no contexto se disponível E habilitado
    let escavadorContext = ''
    if (escavadorEnabled && leadData.escavadorData) {
      escavadorContext = `

    DADOS DO ESCAVADOR (Consulta automática):
    - Processos encontrados: ${leadData.escavadorData.processosEncontrados}
    - Valor total dos processos: R$ ${leadData.escavadorData.totalValue || 0}
    - Processos elegíveis: ${leadData.escavadorData.hasEligibleProcessos ? 'SIM' : 'NÃO'}

    BÔNUS DE PONTUAÇÃO DO ESCAVADOR:
    - Se processos encontrados no Escavador: +30 pontos
    - Se valor total > R$ 50.000: +15 pontos adicional
    - Se múltiplos processos (>1): +10 pontos`
    }

    const systemPrompt = `Você é um especialista em qualificação de leads de precatórios.
    Calcule um score de 0 a 100 baseado em:
    - Possui precatório confirmado: +40 pontos
    - Valor elegível (>10.000): +20 pontos
    - Estado elegível: +10 pontos
    - Demonstra urgência: +15 pontos
    - Enviou documentos: +10 pontos
    - Interesse claro: +5 pontos
    ${escavadorContext}

    Classifique como:
    - hot (80-100): Lead muito quente, pronto para fechar
    - warm (50-79): Lead interessado, precisa acompanhamento
    - cold (20-49): Lead frio, precisa nutrição
    - discard (0-19): Não qualificado

    Retorne um JSON com: score (número), classification (string), reasoning (explicação breve)`

    const prompt = `Dados do lead:
    ${JSON.stringify(leadData, null, 2)}

    Histórico de conversa:
    ${conversationHistory}

    Calcule o score e classificação.`

    try {
      const response = await this.callOpenRouter(prompt, systemPrompt, this.analysisModel)
      const cleanJson = this.cleanJsonResponse(response)
      return JSON.parse(cleanJson)
    } catch (error) {
      console.error('Error calculating score:', error)
      return {
        score: 0,
        classification: 'cold',
        reasoning: 'Erro ao calcular score'
      }
    }
  }

  async shouldTransfer(
    leadScore: number,
    conversationHistory: string,
    messageCount: number,
    customPrompt?: string
  ): Promise<TransferDecision> {
    const systemPrompt = customPrompt || `Você é um assistente que decide quando transferir uma conversa para um humano.
    Critérios para transferência:
    - Score >= 60: transferir com prioridade alta
    - Mensagens com urgência explícita: transferir imediatamente
    - Cliente pedindo atendimento humano: transferir sempre
    - Mais de 5 mensagens sem resolução: considerar transferência
    - Documentos enviados: transferir para análise

    Retorne um JSON com: shouldTransfer (boolean), reason (string), priority (low/medium/high)`

    const prompt = `Score do lead: ${leadScore}
    Número de mensagens: ${messageCount}
    
    Histórico recente:
    ${conversationHistory}
    
    Deve transferir para humano?`

    try {
      const response = await this.callOpenRouter(prompt, systemPrompt, this.analysisModel)
      const cleanJson = this.cleanJsonResponse(response)
      return JSON.parse(cleanJson)
    } catch (error) {
      console.error('Error deciding transfer:', error)
      return {
        shouldTransfer: false,
        reason: 'Continuar atendimento automático'
      }
    }
  }

  async generateResponse(
    message: string,
    leadData: any,
    conversationHistory: string,
    customPrompt: string,
    escavadorEnabled: boolean = true
  ): Promise<string> {
    // Enriquecer o prompt com dados do Escavador se disponível E habilitado
    let enrichedPrompt = customPrompt
    if (escavadorEnabled && leadData.escavadorData && leadData.escavadorData.processosEncontrados > 0) {
      enrichedPrompt += `

    IMPORTANTE - DADOS VERIFICADOS DO ESCAVADOR:
    - Encontramos ${leadData.escavadorData.processosEncontrados} processo(s) em nome do cliente
    - Valor total identificado: R$ ${leadData.escavadorData.totalValue || 0}
    - Tribunais identificados: ${leadData.escavadorData.processos?.map((p: any) => p.tribunal).join(', ') || 'N/A'}

    Use essas informações para personalizar sua resposta e demonstrar que já temos dados sobre os processos do cliente.`
    }

    const systemPrompt = enrichedPrompt

    const prompt = `Dados do lead:
    ${JSON.stringify(leadData, null, 2)}

    Histórico de conversa:
    ${conversationHistory}

    Última mensagem do cliente: ${message}

    Gere uma resposta apropriada.`

    try {
      const response = await this.callOpenRouter(prompt, systemPrompt, this.responseModel)
      return response.trim()
    } catch (error) {
      console.error('Error generating response:', error)
      return 'Obrigado pela mensagem! Um de nossos especialistas entrará em contato em breve.'
    }
  }

  static async getInstance(): Promise<PrecatoriosAI | null> {
    try {
      await dbConnect()
      const config = await BotConfig.findOne().sort({ updatedAt: -1 })
      
      if (!config?.aiConfig?.enabled || !config?.aiConfig?.apiKey) {
        console.log('AI is disabled or API key not configured')
        return null
      }

      if (!config.aiConfig.analysisModel || !config.aiConfig.responseModel) {
        console.log('AI models not configured')
        return null
      }

      return new PrecatoriosAI(
        config.aiConfig.apiKey,
        config.aiConfig.analysisModel,
        config.aiConfig.responseModel,
        config.aiConfig.settings
      )
    } catch (error) {
      console.error('Error getting AI instance:', error)
      return null
    }
  }
}