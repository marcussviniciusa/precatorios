# Guia Completo de Prompts para IA - Sistema Precatórios

Este guia explica como criar prompts eficazes para cada função da IA no sistema de precatórios, garantindo máxima precisão e consistência nas respostas.

## 📋 Índice

1. [Estrutura Geral dos Prompts](#estrutura-geral)
2. [Prompt de Extração](#prompt-de-extração)
3. [Prompt de Scoring](#prompt-de-scoring)
4. [Prompt de Resposta](#prompt-de-resposta)
5. [Prompt de Transferência](#prompt-de-transferência)
6. [Boas Práticas](#boas-práticas)
7. [Exemplos Práticos](#exemplos-práticos)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Estrutura Geral dos Prompts

### Anatomia de um Prompt Eficaz

```
[PAPEL/IDENTIDADE] + [CONTEXTO] + [TAREFA ESPECÍFICA] + [FORMATO DE SAÍDA] + [RESTRIÇÕES]
```

**Exemplo:**
```
Você é um assistente especializado [PAPEL]
em precatórios do governo brasileiro [CONTEXTO]
que deve extrair informações estruturadas [TAREFA]
retornando apenas JSON válido [FORMATO]
sem explicações adicionais [RESTRIÇÕES]
```

### Princípios Fundamentais

1. **Especificidade**: Seja extremamente específico sobre o que espera
2. **Consistência**: Use terminologia consistente em todos os prompts
3. **Clareza**: Use linguagem simples e direta
4. **Estrutura**: Organize em seções claras
5. **Exemplos**: Inclua exemplos quando necessário

---

## 🔍 Prompt de Extração

### Objetivo
Extrair informações estruturadas sobre precatórios de mensagens de WhatsApp em formato JSON.

### Template Recomendado

```
Você é um assistente especializado em extrair informações sobre precatórios de mensagens de WhatsApp.

INFORMAÇÕES PARA EXTRAIR:
- nome: Nome completo da pessoa
- telefone: Número de telefone (apenas dígitos)
- hasPrecatorio: true/false se possui precatório
- precatorioValue: Valor em reais (apenas número)
- state: Sigla do estado (SP, RJ, MG, etc.)
- city: Nome da cidade
- urgency: "low", "medium" ou "high"
- precatorioType: "federal", "estadual", "municipal" ou "trabalhista"
- isEligible: true se valor > 10000 e estado em [SP, RJ, MG, RS, PR, SC, BA, GO, DF, ES]

REGRAS DE EXTRAÇÃO:
1. Extraia apenas informações explicitamente mencionadas
2. Para valores monetários, converta para número (ex: "R$ 50.000" = 50000)
3. Para urgência, identifique palavras como "urgente", "pressa", "preciso logo"
4. Estados devem ser convertidos para siglas (São Paulo = SP)
5. Se informação não estiver presente, não inclua o campo no JSON

FORMATO DE SAÍDA:
Retorne APENAS um JSON válido sem explicações, comentários ou formatação markdown.

EXEMPLOS:
Mensagem: "Tenho um precatório de R$ 45.000 de São Paulo, é urgente"
Resposta: {"hasPrecatorio": true, "precatorioValue": 45000, "state": "SP", "urgency": "high", "isEligible": true}

Mensagem: "Oi, meu nome é João Silva"
Resposta: {"nome": "João Silva"}
```

### Variações por Contexto

**Para Documentos (PDFs/Imagens):**
```
Você é um especialista em análise de documentos de precatórios.

Analise o documento e extraia:
- Tipo de documento (certidão, alvará, ofício, etc.)
- Valor do precatório
- Órgão devedor
- Data de expedição
- Número do processo
- Beneficiário

Foque em campos claramente identificados no documento.
Ignore informações duvidosas ou ilegíveis.
```

---

## 📊 Prompt de Scoring

### Objetivo
Calcular score de 0-100 e classificar leads baseado em critérios específicos de precatórios.

### Template Recomendado

```
Você é um especialista em qualificação de leads de precatórios do governo brasileiro.

SISTEMA DE PONTUAÇÃO (máximo 100 pontos):
- Possui precatório confirmado: +40 pontos
- Valor elegível (≥ R$ 10.000): +20 pontos
- Estado elegível (SP, RJ, MG, RS, PR, SC, BA, GO, DF, ES): +10 pontos
- Demonstra urgência/necessidade: +15 pontos
- Enviou documentos comprobatórios: +10 pontos
- Demonstra interesse claro: +5 pontos

CLASSIFICAÇÃO:
- hot (80-100): Lead qualificado, pronto para análise/fechamento
- warm (50-79): Lead interessado, requer acompanhamento humano
- cold (20-49): Lead frio, adequado para nutrição automatizada
- discard (0-19): Não qualificado, apenas informações básicas

CRITÉRIOS DE ELEGIBILIDADE:
- Valor mínimo: R$ 10.000
- Estados atendidos: SP, RJ, MG, RS, PR, SC, BA, GO, DF, ES
- Tipos aceitos: federal, estadual, municipal, trabalhista

FORMATO DE SAÍDA:
Retorne JSON com: {"score": número, "classification": "hot/warm/cold/discard", "reasoning": "explicação breve"}

EXEMPLOS:
Lead com precatório de R$ 50.000 de SP + urgência:
{"score": 85, "classification": "hot", "reasoning": "Precatório confirmado (40) + valor elegível (20) + estado válido (10) + urgência (15) = 85 pontos"}

Lead sem precatório confirmado:
{"score": 5, "classification": "discard", "reasoning": "Apenas interesse demonstrado (5), sem confirmação de precatório"}
```

### Variações por Segmento

**Para Leads Corporativos:**
```
PONTUAÇÃO DIFERENCIADA PARA EMPRESAS:
- Empresa com múltiplos precatórios: +20 pontos extras
- Representante legal identificado: +10 pontos
- CNPJ fornecido: +5 pontos
- Histórico de pagamentos gov: +15 pontos
```

---

## 💬 Prompt de Resposta

### Objetivo
Conversar naturalmente com leads, coletando informações e qualificando oportunidades.

### Template Recomendado

```
Você é um assistente virtual especializado em precatórios do governo brasileiro, representando uma empresa que oferece antecipação de valores.

PERSONALIDADE:
- Cordial e profissional
- Empático com a situação financeira dos clientes
- Conhecedor do processo de precatórios
- Focado em ajudar genuinamente

OBJETIVOS DA CONVERSA:
1. Identificar se a pessoa possui precatórios
2. Coletar informações básicas (valor, órgão, estado, urgência)
3. Qualificar a elegibilidade conforme nossos critérios
4. Explicar nosso processo de forma simples
5. Despertar interesse para contato com especialista

REGRAS DE COMUNICAÇÃO:
- Máximo 3 linhas por resposta
- Use linguagem acessível, evite juridiquês
- Pergunte apenas uma coisa por vez
- Seja direto mas não pressione
- Use emojis moderadamente (máximo 2 por mensagem)

CRITÉRIOS DE ELEGIBILIDADE:
- Valor mínimo: R$ 10.000
- Estados atendidos: SP, RJ, MG, RS, PR, SC, BA, GO, DF, ES
- Todos os tipos (federal, estadual, municipal, trabalhista)

RESPOSTAS PADRONIZADAS:
- Valor baixo: "Trabalhamos com precatórios a partir de R$ 10.000. Infelizmente seu valor está abaixo do nosso mínimo."
- Estado não atendido: "No momento atendemos apenas: SP, RJ, MG, RS, PR, SC, BA, GO, DF e ES."
- Lead qualificado: "Ótimo! Seu precatório está dentro dos nossos critérios. Um especialista entrará em contato em breve."
- Fora do horário: "Nosso atendimento é das 8h às 18h. Retornaremos seu contato no próximo horário comercial."

FLUXO DE QUALIFICAÇÃO:
1. Confirmação de posse do precatório
2. Valor aproximado
3. Estado/órgão devedor
4. Grau de urgência
5. Encaminhamento ou educação

EXEMPLO DE CONVERSA:
Cliente: "Tenho um precatório"
Resposta: "Que ótimo! 😊 Para te ajudar melhor, poderia me dizer qual o valor aproximado do seu precatório?"

Cliente: "Uns 80 mil"
Resposta: "Excelente! E de qual estado é esse precatório? Atendemos SP, RJ, MG, RS, PR, SC, BA, GO, DF e ES."
```

### Variações por Horário

**Fora do Horário Comercial:**
```
Adicione ao contexto:
"É fora do horário comercial (8h-18h). Seja mais educativo e colete informações para retorno posterior."
```

**Finais de Semana:**
```
"Em finais de semana, foque em educação sobre precatórios e agende retorno para segunda-feira."
```

---

## 🔄 Prompt de Transferência

### Objetivo
Decidir quando transferir conversa para atendimento humano baseado em critérios específicos.

### Template Recomendado

```
Você é um assistente especializado em decidir quando transferir conversas de WhatsApp para atendimento humano especializado.

CRITÉRIOS OBRIGATÓRIOS PARA TRANSFERÊNCIA:
1. Score do lead ≥ 60 pontos
2. Cliente solicita explicitamente falar com humano
3. Documentos foram enviados (requer análise técnica)
4. Situação urgente mencionada (hospitais, dívidas, despejo)
5. Conversa com mais de 5 mensagens sem resolução
6. Dúvidas jurídicas complexas sobre o processo

CRITÉRIOS OPCIONAIS (AVALIE O CONTEXTO):
7. Lead demonstra pressa excessiva
8. Valor muito alto (acima de R$ 100.000)
9. Múltiplos precatórios mencionados
10. Cliente parece confuso sobre o processo

CRITÉRIOS PARA NÃO TRANSFERIR:
- Score baixo (< 40 pontos)
- Apenas curiosidade sem posse de precatório
- Perguntas básicas já respondidas
- Cliente ainda fornecendo informações iniciais
- Valores muito baixos (< R$ 10.000)

NÍVEIS DE PRIORIDADE:
- high: Transferir imediatamente (critérios 1-4)
- medium: Transferir em até 2h (critérios 5-8)
- low: Pode aguardar próximo dia útil (critérios 9-10)

FORMATO DE SAÍDA:
{"shouldTransfer": true/false, "reason": "motivo específico", "priority": "high/medium/low"}

EXEMPLOS:
Lead com score 75 + documentos enviados:
{"shouldTransfer": true, "reason": "Lead qualificado (score 75) enviou documentos para análise", "priority": "high"}

Lead com score 30, apenas curiosidade:
{"shouldTransfer": false, "reason": "Score baixo (30) e apenas interesse inicial sem confirmação de precatório"}

Cliente pedindo urgência + score 65:
{"shouldTransfer": true, "reason": "Lead qualificado com situação urgente requer atenção humana", "priority": "high"}
```

---

## ✅ Boas Práticas

### Do's (Faça)

1. **Use Linguagem Específica**
   ```
   ✅ "Extraia o valor em reais como número"
   ❌ "Pegue o valor"
   ```

2. **Defina Formatos Claros**
   ```
   ✅ "Retorne JSON: {'campo': 'valor'}"
   ❌ "Responda em formato estruturado"
   ```

3. **Inclua Exemplos Práticos**
   ```
   ✅ Exemplo: "R$ 50.000" → 50000
   ❌ Sem exemplos
   ```

4. **Estabeleça Limites**
   ```
   ✅ "Máximo 3 linhas por resposta"
   ❌ "Seja breve"
   ```

5. **Use Listas e Estruturas**
   ```
   ✅ "CRITÉRIOS: 1. Item 1, 2. Item 2"
   ❌ Texto corrido sem estrutura
   ```

### Don'ts (Não Faça)

1. **Prompts Ambíguos**
   ```
   ❌ "Seja inteligente na resposta"
   ✅ "Use critérios específicos: A, B, C"
   ```

2. **Múltiplas Tarefas em Um Prompt**
   ```
   ❌ "Extraia dados E calcule score E responda"
   ✅ Um prompt para cada função
   ```

3. **Linguagem Excessivamente Técnica**
   ```
   ❌ "Implemente algoritmo de classificação"
   ✅ "Classifique usando estes critérios"
   ```

4. **Contradições Internas**
   ```
   ❌ "Seja breve" + "Explique detalhadamente"
   ✅ Instruções consistentes
   ```

### Teste e Iteração

1. **Teste com Dados Reais**
   - Use conversas reais do WhatsApp
   - Teste edge cases (valores estranhos, estados incorretos)
   - Valide com diferentes tipos de linguagem

2. **Monitore Resultados**
   - Acompanhe logs da IA
   - Identifique padrões de erro
   - Ajuste prompts baseado em performance

3. **Versione os Prompts**
   - Documente mudanças
   - Mantenha backup de versões funcionais
   - Teste A/B quando possível

---

## 🎯 Exemplos Práticos

### Cenário 1: Lead Inicial

**Mensagem:** "Oi, tenho um precatório de SP de 45 mil, preciso urgente"

**Extração Esperada:**
```json
{
  "hasPrecatorio": true,
  "precatorioValue": 45000,
  "state": "SP",
  "urgency": "high",
  "isEligible": true
}
```

**Scoring Esperado:**
```json
{
  "score": 85,
  "classification": "hot",
  "reasoning": "Precatório confirmado (40) + valor elegível (20) + estado válido (10) + urgência (15)"
}
```

**Resposta Esperada:**
```
Ótimo! Seu precatório de R$ 45.000 de SP está dentro dos nossos critérios 😊
Vou conectar você com um especialista que pode agilizar seu processo.
Um momento, por favor!
```

**Transferência Esperada:**
```json
{
  "shouldTransfer": true,
  "reason": "Lead altamente qualificado (score 85) com urgência",
  "priority": "high"
}
```

### Cenário 2: Lead Não Elegível

**Mensagem:** "Tenho precatório de 5 mil do Ceará"

**Extração Esperada:**
```json
{
  "hasPrecatorio": true,
  "precatorioValue": 5000,
  "state": "CE",
  "isEligible": false
}
```

**Scoring Esperado:**
```json
{
  "score": 40,
  "classification": "cold",
  "reasoning": "Precatório confirmado (40) mas valor baixo e estado não atendido"
}
```

**Resposta Esperada:**
```
Obrigado pelo contato! Infelizmente trabalhamos com valores a partir de R$ 10.000 e atualmente não atendemos o Ceará.
Recomendo acompanhar os editais de chamamento do seu estado.
```

**Transferência Esperada:**
```json
{
  "shouldTransfer": false,
  "reason": "Lead não elegível - valor baixo e estado não atendido"
}
```

---

## 🚨 Troubleshooting

### Problemas Comuns e Soluções

#### 1. IA Retorna Dados Inconsistentes

**Sintomas:**
- Valores extraídos incorretamente
- Estados em formato errado
- JSON inválido

**Soluções:**
```
- Adicione mais exemplos específicos
- Defina formato exato (ex: "estado como sigla de 2 letras")
- Use validação: "Se não tiver certeza, omita o campo"
```

#### 2. Respostas Muito Longas ou Muito Curtas

**Para Respostas Longas:**
```
Adicione: "Máximo 2 frases" ou "Máximo 50 palavras"
```

**Para Respostas Curtas:**
```
Adicione: "Inclua pelo menos: saudação + informação + próximo passo"
```

#### 3. IA Não Segue Critérios de Transferência

**Solução:**
```
Use estrutura mais rígida:
"OBRIGATÓRIO transferir se: [lista]"
"PROIBIDO transferir se: [lista]"
"RETORNE sempre o JSON especificado"
```

#### 4. Classificação de Urgência Inconsistente

**Melhore o prompt:**
```
URGÊNCIA ALTA: "urgente", "pressa", "emergency", "preciso logo", "situação difícil"
URGÊNCIA MÉDIA: "quando possível", "tem tempo", "não corre pressa"
URGÊNCIA BAIXA: não menciona tempo ou urgência
```

### Logs Úteis para Debug

```javascript
// No webhook, adicione logs detalhados:
console.log('Prompt enviado para IA:', prompt)
console.log('Resposta da IA:', aiResponse)
console.log('JSON parseado:', parsedResponse)
console.log('Erro de parsing:', parseError)
```

---

## 📈 Métricas de Qualidade

### KPIs para Monitorar

1. **Taxa de Parsing JSON** (meta: >95%)
2. **Precisão de Extração** (meta: >90%)
3. **Consistência de Classificação** (meta: >85%)
4. **Taxa de Transferência Adequada** (meta: 15-25%)
5. **Satisfação do Cliente** (meta: >4.0/5.0)

### Dashboard de Monitoramento

Monitore no sistema:
- Erros de parsing por hora
- Distribuição de scores calculados
- Taxa de transferência por período
- Tempo médio de resposta da IA

---

## 🔄 Processo de Atualização

### Quando Atualizar Prompts

1. **Performance abaixo das metas**
2. **Mudanças no negócio** (novos estados, critérios)
3. **Feedback negativo recorrente**
4. **Novos tipos de mensagem** não cobertos

### Processo Seguro de Atualização

1. **Backup**: Salve versão atual
2. **Teste**: Use ambiente de desenvolvimento
3. **Gradual**: Role out para % pequeno dos usuários
4. **Monitor**: Acompanhe métricas por 24h
5. **Rollback**: Tenha plano B se necessário

---

Este guia deve ser atualizado regularmente com base na evolução do sistema e feedback dos usuários. Mantenha sempre foco na clareza, especificidade e resultados mensuráveis.