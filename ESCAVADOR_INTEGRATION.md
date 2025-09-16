# Integração com API Escavador

## Visão Geral

Foi implementada uma integração completa com a API do Escavador para enriquecimento automático de leads quando um CPF é detectado nas conversas do WhatsApp. O sistema consulta automaticamente processos jurídicos e utiliza essas informações para melhorar a qualificação de leads e personalizar respostas da IA.

## Funcionalidades Implementadas

### 1. Detecção Automática de CPF
- Sistema detecta CPF válido nas mensagens do usuário
- Validação completa do CPF (algoritmo dos dígitos verificadores)
- Formatação automática para exibição

### 2. Consulta Automática do Escavador
- Integração com endpoint real: `https://api.escavador.com/v2/envolvido/processos`
- Autenticação via Bearer Token configurável
- Cache inteligente (padrão 24 horas, configurável)
- Tratamento de erros e fallbacks

### 3. Processamento Inteligente de Processos
- Filtragem automática de processos relevantes para precatórios
- Identificação de tribunais (federal, estadual, municipal, trabalhista)
- Detecção de assuntos relacionados (execução, fazenda, INSS, previdenciário)
- Análise de partes contra entes públicos
- Extração de valores monetários

### 4. Enriquecimento de Leads
- Dados salvos automaticamente no perfil do lead
- Estrutura completa de processos encontrados
- Cálculo de valor total e elegibilidade
- Histórico de consultas e timestamps

### 5. Pontuação IA Aprimorada
- **+30 pontos** se processos encontrados no Escavador
- **+15 pontos** adicionais se valor total > R$ 50.000
- **+10 pontos** se múltiplos processos encontrados
- Integração completa com sistema de scoring existente

### 6. Respostas Personalizadas
- IA menciona processos encontrados nas respostas
- Informações sobre tribunais e valores identificados
- Demonstra conhecimento prévio sobre o caso do cliente

### 7. Configuração Completa
- Interface de configuração em `/config/ai`
- API Key configurável com segurança
- Tempo de cache personalizável
- Limite máximo de processos processados
- Toggle completo para habilitar/desabilitar

## Estrutura de Dados

### Lead Schema (MongoDB)
```typescript
{
  cpf: String,
  escavadorData: {
    consultedAt: Date,
    processosEncontrados: Number,
    ultimaConsulta: Date,
    processos: [{
      numeroProcesso: String,
      tribunal: String,
      tribunalSigla: String,
      valor: Number,
      valorFormatado: String,
      status: String,
      dataInicio: Date,
      ultimaMovimentacao: Date,
      tipo: String, // federal, estadual, municipal, trabalhista
      classe: String,
      assunto: String,
      assuntosNormalizados: [String],
      estado: String,
      estadoNome: String,
      grau: Number,
      quantidadeMovimentacoes: Number,
      partes: {
        ativo: String,
        passivo: String
      }
    }],
    totalValue: Number,
    hasEligibleProcessos: Boolean,
    envolvidoNome: String,
    quantidadeTotalProcessos: Number
  }
}
```

### Bot Configuration
```typescript
{
  escavadorConfig: {
    enabled: Boolean, // Controle mestre da integração
    apiKey: String,   // Chave da API Escavador
    cacheHours: Number, // Tempo de cache (padrão: 24h)
    maxProcessos: Number // Limite de processos (padrão: 10)
  }
}
```

## Arquivos Implementados/Modificados

### Novos Arquivos
- **`src/lib/escavador-service.ts`**: Serviço principal da integração
  - Classe `EscavadorService` com método `buscarProcessosPorCPF()`
  - Processamento e filtragem de processos relevantes
  - Validação e formatação de CPF
  - Tratamento completo de erros

### Arquivos Modificados
- **`src/models/Lead.ts`**: Adicionado campo `cpf` e estrutura `escavadorData`
- **`src/models/BotConfig.ts`**: Adicionado schema `escavadorConfig`
- **`src/types/index.ts`**: Interfaces TypeScript para Lead e BotConfig
- **`src/app/api/webhook/evolution/route.ts`**: Integração com webhook do WhatsApp
- **`src/lib/ai-service.ts`**: Métodos da IA atualizados para usar dados Escavador
- **`src/app/(dashboard)/config/ai/page.tsx`**: Interface de configuração

## Fluxo de Funcionamento

1. **Recepção de Mensagem**: WhatsApp webhook recebe mensagem
2. **Extração de CPF**: IA extrai e valida CPF da mensagem
3. **Verificação de Cache**: Verifica se já consultou este CPF recentemente
4. **Consulta Escavador**: Se necessário, consulta a API real do Escavador
5. **Processamento**: Filtra processos relevantes para precatórios
6. **Armazenamento**: Salva dados no perfil do lead
7. **Scoring**: IA recalcula score com bônus do Escavador
8. **Resposta**: IA gera resposta personalizada com dados encontrados

## Filtros de Relevância

### Tribunais Aceitos
- Federal (TRF, Justiça Federal)
- Estadual (TJ)
- Municipal
- Trabalhista (TRT)

### Assuntos Relevantes
- Precatório, Requisição, RPV
- Execução contra Fazenda Pública
- Processos previdenciários
- Ações contra entes públicos (União, Estado, Município, INSS)

### Critérios de Elegibilidade
- Tribunal relevante + (assunto relevante OU classe relevante OU contra ente público)
- Processo não arquivado há muito tempo
- Valor da causa identificável

## Configuração e Uso

### 1. Configurar API Key
1. Acesse `/config/ai`
2. Navegue até a seção "Integração Escavador"
3. Insira a API Key do Escavador
4. Configure tempo de cache (padrão: 24 horas)
5. Defina limite de processos (padrão: 10)
6. Ative a integração

### 2. Variável de Ambiente
```env
ESCAVADOR_API_KEY=sua_chave_aqui
```

### 3. Teste da Integração
- Envie uma mensagem com CPF válido via WhatsApp
- Verifique logs para confirmar consulta
- Observe atualização automática do lead
- Veja resposta personalizada da IA

## Segurança e Performance

### Medidas de Segurança
- API Key armazenada de forma segura no banco
- Validação rigorosa de CPF
- Tratamento de erros sem exposição de dados sensíveis
- Logs controlados sem informações pessoais

### Otimizações de Performance
- Cache inteligente para evitar consultas desnecessárias
- Processamento assíncrono não bloqueante
- Limite de processos para evitar sobrecarga
- Timeout configurável para chamadas da API

### Controle de Custos
- Cache configurável para reduzir chamadas à API
- Verificação de CPF antes da consulta
- Limite máximo de processos processados
- Toggle para desabilitar completamente quando necessário

## Desativação Completa

Quando desabilitado na configuração (`enabled: false`):
- ❌ Não executa consultas à API Escavador
- ❌ Não calcula pontos extras no scoring
- ❌ Não enriquece respostas da IA com dados
- ❌ Não processa ou armazena dados do Escavador
- ✅ CPF ainda é detectado e armazenado normalmente
- ✅ Sistema funciona normalmente sem a integração

## Logs e Monitoramento

### Logs Importantes
```
[Escavador] CPF detectado: 12345678901. Iniciando consulta...
[Escavador] Dados encontrados: 3 processos
[Escavador] Encontrados 2 processos relevantes, valor total: R$ 45000
[Escavador] CPF detectado mas integração está desabilitada
```

### Métricas Monitoradas
- Número de consultas realizadas
- Taxa de sucesso das consultas
- Processos encontrados vs relevantes
- Tempo de resposta da API
- Leads enriquecidos com dados Escavador

## Estrutura da Resposta Real da API

Baseado no arquivo `envolvido_processos.json`, a API retorna:
```json
{
  "envolvido_encontrado": {
    "nome": "string",
    "outros_nomes": ["string"],
    "tipo_pessoa": "FISICA|JURIDICA",
    "quantidade_processos": number,
    "cpfs_com_esse_nome": number
  },
  "items": [{
    "numero_cnj": "string",
    "titulo_polo_ativo": "string",
    "titulo_polo_passivo": "string",
    "ano_inicio": number,
    "data_inicio": "string",
    "data_ultima_movimentacao": "string",
    "estado_origem": {
      "nome": "string",
      "sigla": "string"
    },
    "fontes": [{
      "nome": "string",
      "sigla": "string",
      "tipo": "TRIBUNAL",
      "grau": number,
      "capa": {
        "classe": "string",
        "assunto": "string",
        "valor_causa": {
          "valor": "string",
          "valor_formatado": "string"
        },
        "assuntos_normalizados": [{
          "nome": "string",
          "path_completo": "string"
        }]
      }
    }]
  }],
  "links": {
    "next": "string|null"
  },
  "paginator": {
    "per_page": number
  }
}
```

## Roadmap Futuro

### Melhorias Planejadas
- [ ] Integração com outros serviços de consulta jurídica
- [ ] Análise de histórico de movimentações processuais
- [ ] Notificações automáticas de novos processos
- [ ] Dashboard específico para dados do Escavador
- [ ] Relatórios de efetividade da integração
- [ ] Integração com documentos (OCR para extrair CPF de imagens)

### Considerações Técnicas
- API do Escavador tem rate limiting - respeitar limites
- Dados são sensíveis - manter conformidade com LGPD
- Cache pode ser expandido com Redis para alta performance
- Considerar webhook do Escavador para atualizações em tempo real