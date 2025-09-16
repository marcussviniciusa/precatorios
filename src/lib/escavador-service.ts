// Interfaces baseadas na estrutura real da API Escavador
interface ProcessoEscavador {
  numero_cnj: string
  titulo_polo_ativo: string
  titulo_polo_passivo: string
  ano_inicio: number
  data_inicio: string
  data_ultima_movimentacao: string
  estado_origem: {
    nome: string
    sigla: string
  }
  fontes: Array<{
    id: number
    descricao: string
    nome: string
    sigla: string
    tipo: string
    grau?: number
    capa?: {
      classe?: string
      assunto?: string
      valor_causa?: {
        valor: string
        valor_formatado: string
      }
      assuntos_normalizados?: Array<{
        nome: string
        path_completo: string
      }>
    }
  }>
  match_documento_por: string
  tipo_match: string
  quantidade_movimentacoes: number
}

interface EnvolvidoEscavador {
  nome: string
  outros_nomes: string[]
  tipo_pessoa: string
  quantidade_processos: number
  cpfs_com_esse_nome: number
}

interface EscavadorResponse {
  envolvido_encontrado: EnvolvidoEscavador
  items: ProcessoEscavador[]
  links: {
    next: string | null
  }
  paginator: {
    per_page: number
  }
}

export class EscavadorService {
  private apiKey: string
  private apiUrl: string = 'https://api.escavador.com/v2' // URL base da API

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Busca processos por CPF usando a API real do Escavador
   * @param cpf - CPF do lead (apenas números)
   * @returns Dados dos processos encontrados ou null
   */
  async buscarProcessosPorCPF(cpf: string): Promise<any> {
    try {
      console.log(`[Escavador] Consultando processos para CPF: ${cpf}`)

      // Fazer chamada real para a API do Escavador
      const url = new URL(`${this.apiUrl}/envolvido/processos`)
      url.searchParams.append('cpf_cnpj', cpf)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Escavador] Erro na API: ${response.status} - ${errorText}`)
        return null
      }

      const data: EscavadorResponse = await response.json()
      console.log(`[Escavador] Resposta recebida:`, JSON.stringify(data, null, 2))

      if (!data.items || data.items.length === 0) {
        console.log(`[Escavador] Nenhum processo encontrado para CPF: ${cpf}`)
        return null
      }

      // Processar e filtrar apenas processos relevantes (precatórios)
      const processosRelevantes = await this.processarResultados(data.items)

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
        hasEligibleProcessos: totalValue >= 10000,
        // Dados do envolvido encontrado
        envolvidoNome: data.envolvido_encontrado?.nome,
        quantidadeTotalProcessos: data.envolvido_encontrado?.quantidade_processos
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
        // Extrair valor da causa se disponível
        const valorCausa = processo.fontes[0]?.capa?.valor_causa?.valor
        const valor = valorCausa ? parseFloat(valorCausa) : 0

        const processoData = {
          numeroProcesso: processo.numero_cnj,
          tribunal: processo.fontes[0]?.nome || 'Não informado',
          tribunalSigla: processo.fontes[0]?.sigla || '',
          valor: valor,
          valorFormatado: processo.fontes[0]?.capa?.valor_causa?.valor_formatado || '',
          status: 'ativo', // TODO: Mapear status baseado em outras informações
          dataInicio: processo.data_inicio ? new Date(processo.data_inicio) : undefined,
          ultimaMovimentacao: processo.data_ultima_movimentacao ? new Date(processo.data_ultima_movimentacao) : undefined,
          tipo: this.detectarTipoProcesso(processo),
          classe: processo.fontes[0]?.capa?.classe || '',
          assunto: processo.fontes[0]?.capa?.assunto || 'Não informado',
          assuntosNormalizados: processo.fontes[0]?.capa?.assuntos_normalizados?.map(a => a.nome) || [],
          estado: processo.estado_origem?.sigla || '',
          estadoNome: processo.estado_origem?.nome || '',
          grau: processo.fontes[0]?.grau || 1,
          quantidadeMovimentacoes: processo.quantidade_movimentacoes || 0,
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
    const tribunalSigla = processo.fontes[0]?.sigla?.toLowerCase() || ''
    const assunto = processo.fontes[0]?.capa?.assunto?.toLowerCase() || ''
    const classe = processo.fontes[0]?.capa?.classe?.toLowerCase() || ''

    // Verificar assuntos normalizados
    const assuntosNormalizados = processo.fontes[0]?.capa?.assuntos_normalizados || []
    const assuntoNormalizado = assuntosNormalizados
      .map(a => a.path_completo?.toLowerCase() || '')
      .join(' ')

    // Verificar se é de um tribunal relevante
    const tribunalRelevante =
      tribunal.includes('federal') ||
      tribunal.includes('estadual') ||
      tribunal.includes('municipal') ||
      tribunal.includes('trabalhista') ||
      tribunalSigla.includes('trf') ||
      tribunalSigla.includes('tj') ||
      tribunalSigla.includes('trt') ||
      tribunalSigla.includes('jf') // Justiça Federal

    // Verificar se o assunto indica precatório ou processo contra poder público
    const assuntoRelevante =
      assunto.includes('precatório') ||
      assunto.includes('requisição') ||
      assunto.includes('rpv') ||
      assunto.includes('execução') ||
      assunto.includes('fazenda') ||
      assunto.includes('estado') ||
      assunto.includes('município') ||
      assunto.includes('união') ||
      assunto.includes('inss') ||
      assunto.includes('servidor') ||
      assuntoNormalizado.includes('execução') ||
      assuntoNormalizado.includes('fazenda') ||
      assuntoNormalizado.includes('previdenciário')

    // Verificar classe processual
    const classeRelevante =
      classe.includes('execução') ||
      classe.includes('cumprimento') ||
      classe.includes('monitória') ||
      classe.includes('ordinária') ||
      classe.includes('sumária')

    // Verificar se é contra ente público nas partes
    const poloPassivo = processo.titulo_polo_passivo?.toLowerCase() || ''
    const contraEntePubico =
      poloPassivo.includes('estado') ||
      poloPassivo.includes('município') ||
      poloPassivo.includes('união') ||
      poloPassivo.includes('fazenda') ||
      poloPassivo.includes('inss') ||
      poloPassivo.includes('prefeitura')

    return (tribunalRelevante && (assuntoRelevante || classeRelevante || contraEntePubico))
  }

  /**
   * Detecta o tipo do processo baseado no tribunal
   */
  private detectarTipoProcesso(processo: ProcessoEscavador): string {
    const tribunal = processo.fontes[0]?.nome?.toLowerCase() || ''
    const tribunalSigla = processo.fontes[0]?.sigla?.toLowerCase() || ''

    if (tribunal.includes('federal') || tribunalSigla.includes('trf') || tribunalSigla.includes('jf')) {
      return 'federal'
    } else if (tribunal.includes('estadual') || tribunalSigla.startsWith('tj')) {
      return 'estadual'
    } else if (tribunal.includes('municipal')) {
      return 'municipal'
    } else if (tribunal.includes('trabalhista') || tribunalSigla.includes('trt')) {
      return 'trabalhista'
    }

    return 'outros'
  }

  /**
   * Método estático para obter instância do serviço
   */
  static getInstance(): EscavadorService | null {
    const apiKey = process.env.ESCAVADOR_API_KEY

    if (!apiKey) {
      console.warn('[Escavador] API Key não configurada. Serviço desabilitado.')
      return null
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