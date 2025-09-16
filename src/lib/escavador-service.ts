// Mock do Escavador SDK - Substitua com a integração real
interface ProcessoEscavador {
  numero_cnj: string
  fontes: Array<{ nome: string }>
  data_inicio?: string
  data_ultima_movimentacao?: string
  titulo_polo_ativo?: string
  titulo_polo_passivo?: string
  assunto?: string
  valor?: number
}

interface EnvolvidoEscavador {
  nome: string
  cpf: string
}

export class EscavadorService {
  private apiKey: string
  private apiUrl: string = 'https://api.escavador.com/v2' // URL base da API

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Busca processos por CPF
   * @param cpf - CPF do lead (apenas números)
   * @returns Dados dos processos encontrados ou null
   */
  async buscarProcessosPorCPF(cpf: string): Promise<any> {
    try {
      console.log(`[Escavador] Consultando processos para CPF: ${cpf}`)

      // TODO: Implementar chamada real para a API do Escavador
      // Por enquanto, vamos simular uma resposta
      const response = await this.mockEscavadorAPICall(cpf)

      if (!response || response.processos.length === 0) {
        console.log(`[Escavador] Nenhum processo encontrado para CPF: ${cpf}`)
        return null
      }

      // Processar e filtrar apenas processos relevantes (precatórios)
      const processosRelevantes = await this.processarResultados(response.processos)

      if (processosRelevantes.length === 0) {
        console.log(`[Escavador] Nenhum precatório relevante encontrado para CPF: ${cpf}`)
        return null
      }

      const totalValue = processosRelevantes.reduce((sum, p) => sum + (p.valor || 0), 0)

      const resultado = {
        consultedAt: new Date(),
        processosEncontrados: processosRelevantes.length,
        ultimaConsulta: new Date(),
        processos: processosRelevantes,
        totalValue,
        hasEligibleProcessos: totalValue >= 10000
      }

      console.log(`[Escavador] Encontrados ${processosRelevantes.length} processos relevantes, valor total: R$ ${totalValue}`)

      return resultado

    } catch (error) {
      console.error('[Escavador] Erro na consulta:', error)
      return null
    }
  }

  /**
   * Processa e filtra resultados do Escavador
   */
  private async processarResultados(processos: ProcessoEscavador[]): Promise<any[]> {
    const processosRelevantes = []

    for (const processo of processos) {
      if (this.isPrecatorioRelevante(processo)) {
        const processoData = {
          numeroProcesso: processo.numero_cnj,
          tribunal: processo.fontes[0]?.nome || 'Não informado',
          valor: processo.valor || 0,
          status: 'ativo', // TODO: Mapear status real
          dataInicio: processo.data_inicio ? new Date(processo.data_inicio) : undefined,
          ultimaMovimentacao: processo.data_ultima_movimentacao ? new Date(processo.data_ultima_movimentacao) : undefined,
          tipo: this.detectarTipoProcesso(processo),
          assunto: processo.assunto || 'Não informado',
          partes: {
            ativo: processo.titulo_polo_ativo || '',
            passivo: processo.titulo_polo_passivo || ''
          }
        }

        processosRelevantes.push(processoData)
      }
    }

    return processosRelevantes
  }

  /**
   * Verifica se o processo pode ser um precatório relevante
   */
  private isPrecatorioRelevante(processo: ProcessoEscavador): boolean {
    const tribunal = processo.fontes[0]?.nome?.toLowerCase() || ''
    const assunto = processo.assunto?.toLowerCase() || ''

    // Verificar se é de um tribunal relevante
    const tribunalRelevante =
      tribunal.includes('federal') ||
      tribunal.includes('estadual') ||
      tribunal.includes('municipal') ||
      tribunal.includes('trabalhista') ||
      tribunal.includes('trf') ||
      tribunal.includes('tjsp') ||
      tribunal.includes('trt')

    // Verificar se o assunto indica precatório
    const assuntoRelevante =
      assunto.includes('precatório') ||
      assunto.includes('requisição') ||
      assunto.includes('rpv') ||
      assunto.includes('execução')

    return tribunalRelevante || assuntoRelevante
  }

  /**
   * Detecta o tipo do processo baseado no tribunal
   */
  private detectarTipoProcesso(processo: ProcessoEscavador): string {
    const tribunal = processo.fontes[0]?.nome?.toLowerCase() || ''

    if (tribunal.includes('federal') || tribunal.includes('trf')) {
      return 'federal'
    } else if (tribunal.includes('estadual') || tribunal.includes('tj')) {
      return 'estadual'
    } else if (tribunal.includes('municipal')) {
      return 'municipal'
    } else if (tribunal.includes('trabalhista') || tribunal.includes('trt')) {
      return 'trabalhista'
    }

    return 'outros'
  }

  /**
   * Mock da chamada à API do Escavador
   * TODO: Substituir pela implementação real usando o SDK do Escavador
   */
  private async mockEscavadorAPICall(cpf: string): Promise<any> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Para testes, vamos retornar dados mockados baseados no CPF
    if (cpf === '12345678901') {
      return {
        envolvido: {
          nome: 'João da Silva',
          cpf: '12345678901'
        },
        processos: [
          {
            numero_cnj: '0000123-45.2020.8.26.0100',
            fontes: [{ nome: 'TJSP - Tribunal de Justiça de São Paulo' }],
            data_inicio: '2020-01-15',
            data_ultima_movimentacao: '2024-10-20',
            titulo_polo_ativo: 'João da Silva',
            titulo_polo_passivo: 'Estado de São Paulo',
            assunto: 'Precatório Alimentar',
            valor: 85000
          },
          {
            numero_cnj: '0000456-78.2019.5.02.0001',
            fontes: [{ nome: 'TRT2 - Tribunal Regional do Trabalho' }],
            data_inicio: '2019-06-10',
            data_ultima_movimentacao: '2024-09-15',
            titulo_polo_ativo: 'João da Silva',
            titulo_polo_passivo: 'Empresa ABC Ltda',
            assunto: 'Execução Trabalhista',
            valor: 45000
          }
        ]
      }
    }

    // CPF não encontrado
    return {
      envolvido: null,
      processos: []
    }
  }

  /**
   * Método estático para obter instância do serviço
   */
  static getInstance(): EscavadorService | null {
    const apiKey = process.env.ESCAVADOR_API_KEY

    if (!apiKey) {
      console.warn('[Escavador] API Key não configurada. Usando modo mock.')
      // Retornar instância mock para desenvolvimento
      return new EscavadorService('mock-api-key')
    }

    return new EscavadorService(apiKey)
  }
}

/**
 * Função helper para validar CPF
 */
export function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '')

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Validação dos dígitos verificadores
  let sum = 0
  let remainder

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.substring(9, 10))) return false

  // Segundo dígito verificador
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.substring(10, 11))) return false

  return true
}

/**
 * Formata CPF para exibição
 */
export function formatCPF(cpf: string): string {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '')

  // Aplica máscara XXX.XXX.XXX-XX
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}