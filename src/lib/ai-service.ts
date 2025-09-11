import dbConnect from '@/lib/mongodb'
import BotConfig from '@/models/BotConfig'

interface ExtractedInfo {
  name?: string
  phone?: string
  hasPrecatorio?: boolean
  precatorioValue?: number
  state?: string
  city?: string
  urgency?: 'low' | 'medium' | 'high'
  documentType?: string
  precatorioType?: string
  isEligible?: boolean
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
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions'

  constructor(apiKey: string, analysisModel: string, responseModel: string) {
    this.apiKey = apiKey
    this.analysisModel = analysisModel
    this.responseModel = responseModel
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
          temperature: 0.3,
          max_tokens: 500
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

  async calculateScore(leadData: any, conversationHistory: string): Promise<ScoreResult> {
    const systemPrompt = `Você é um especialista em qualificação de leads de precatórios.
    Calcule um score de 0 a 100 baseado em:
    - Possui precatório confirmado: +40 pontos
    - Valor elegível (>10.000): +20 pontos
    - Estado elegível: +10 pontos
    - Demonstra urgência: +15 pontos
    - Enviou documentos: +10 pontos
    - Interesse claro: +5 pontos
    
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
    messageCount: number
  ): Promise<TransferDecision> {
    const systemPrompt = `Você é um assistente que decide quando transferir uma conversa para um humano.
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
    customPrompt?: string
  ): Promise<string> {
    const systemPrompt = customPrompt || `Você é um assistente virtual especializado em precatórios do governo.
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
        config.aiConfig.responseModel
      )
    } catch (error) {
      console.error('Error getting AI instance:', error)
      return null
    }
  }
}