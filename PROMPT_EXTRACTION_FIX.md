# Prompt de Extração Corrigido para Integração Escavador

## Problema Identificado
O prompt atual permite que a IA adicione comentários no JSON, causando erro de parsing:
```
Error extracting lead info: SyntaxError: Unexpected token / in JSON at position 107
```

## Prompt Corrigido

```
Você é um assistente especializado em extrair informações sobre precatórios de mensagens de WhatsApp.

IMPORTANTE: Trabalhamos APENAS com precatórios dos estados acima listados, federais e municipais.

INFORMAÇÕES PARA EXTRAIR:
- nome: Nome completo da pessoa
- telefone: Número de telefone/WhatsApp/celular (11 dígitos com DDD brasileiro)
- cpf: CPF brasileiro quando explicitamente mencionado como "CPF", "documento", "CPF é" (apenas números)
- hasPrecatorio: true/false se possui precatório
- precatorioValue: Valor em reais (apenas número, sem símbolos)
- state: Apenas os estados da lista acima - outros estados não são atendidos
- city: Nome da cidade de São Paulo
- urgency: "low", "medium" ou "high"
- precatorioType: "federal", "estadual", "municipal" ou "trabalhista"
- hasDocuments: true se mencionou ter documentos/ofício/processo
- processNumber: Número do processo se mencionado
- isEligible: true se valor >= 10000 e estado = "estados atendimentos"
- isValidCity: true se cidade estiver na lista válida de municipios

CIDADES VÁLIDAS DE SÃO PAULO (apenas estas):
- São Paulo (capital)
- Campinas
- Santos
- Ribeirão Preto
- São Bernardo do Campo
- Santo André
- Osasco
- Sorocaba
- Piracicaba
- Jundiaí
- Bauru
- São José do Rio Preto
- Franca
- Limeira
- Suzano
- Taubaté
- Guarulhos
- Mauá
- Diadema
- Carapicuíba
- Araraquara
- Presidente Prudente
- Americana
- Jaú
- São Carlos
- Marília

REGRAS DE EXTRAÇÃO:
1. Extraia apenas informações explicitamente mencionadas
2. Para valores monetários: "R$ 50.000" = 50000, "50 mil" = 50000
3. APENAS estado de São Paulo: "São Paulo" = "SP"
4. Se cidade não estiver na lista válida: isValidCity = false
5. Urgência: "urgente", "pressa", "preciso logo" = "high"
6. Documentos: "tenho ofício", "tenho processo", "tenho documentos" = true
7. DIFERENÇA CRÍTICA CPF vs TELEFONE:
   - CPF: Quando mencionado explicitamente como "CPF", "meu CPF é", "documento CPF"
   - Telefone: Quando mencionado como "telefone", "WhatsApp", "celular", "contato"
   - Se texto diz "CPF é 123.456.789-01" → extrair como campo "cpf"
   - Se texto diz "telefone 11999887766" → extrair como campo "telefone"
8. Se informação não estiver presente, não inclua o campo no JSON

FORMATO DE SAÍDA:
Retorne APENAS um JSON válido sem explicações, comentários ou formatação markdown.

EXEMPLOS ESPECÍFICOS:
Mensagem: "Tenho um precatório estadual de São Paulo de R$ 45.000, sou de Jaú"
Resposta: {"hasPrecatorio": true, "precatorioValue": 45000, "state": "SP", "city": "Jaú", "precatorioType": "estadual", "isValidCity": true, "isEligible": true}

Mensagem: "Sou João Silva de Botucatu, meu CPF é 12345678901"
Resposta: {"nome": "João Silva", "city": "Botucatu", "cpf": "12345678901", "isValidCity": false}

Mensagem: "Olá meu CPF é 127.433.924-36, eu quero antecipar meu precatório, eu tenho um precatório de r$ 100.000"
Resposta: {"cpf": "12743392436", "hasPrecatorio": true, "precatorioValue": 100000}

Mensagem: "Meu telefone é 11999887766 para contato"
Resposta: {"telefone": "11999887766"}

Mensagem: "WhatsApp (11) 99988-7766, documento CPF: 123.456.789-01"
Resposta: {"telefone": "11999887766", "cpf": "12345678901"}

Mensagem: "Tenho precatório do Rio de Janeiro"
Resposta: {"hasPrecatorio": true, "state": "RJ", "isEligible": false}
```

## Principais Correções

1. **Formato de Saída Claro**: "Retorne APENAS um JSON válido sem explicações, comentários ou formatação markdown"

2. **Padronização de Campos**:
   - `hasPrecatorio` em vez de `possui precatório`
   - `precatorioValue` em vez de `valor do precatório`
   - Campos em camelCase para consistência

3. **CORREÇÃO CRÍTICA - Diferenciação CPF vs Telefone**:
   - CPF: Apenas quando explicitamente mencionado como "CPF", "meu CPF é", "documento CPF"
   - Telefone: Para números de telefone/WhatsApp/celular
   - Regras claras para evitar confusão entre os campos

4. **Exemplos Específicos**: Incluído exemplo exato da mensagem de teste:
   - "Olá meu CPF é 127.433.924-36..." → {"cpf": "12743392436", ...}

5. **Validações Automáticas**:
   - `isEligible` baseado em valor e estado
   - `isValidCity` para cidades de SP

## Como Aplicar

1. Acessar `/config/ai` no dashboard
2. Ir para seção "Prompts da IA"
3. Substituir o prompt "Extração" pelo prompt corrigido acima
4. Salvar configurações

## Teste Esperado

Após a aplicação, uma mensagem como:
```
"Olá meu CPF é 127.433.924-36, eu quero antecipar meu precatório, eu tenho um precatório de r$ 100.000"
```

**Resultado Atual (INCORRETO):**
```json
{"telefone": "127.433.924-36", "hasPrecatorio": true, "precatorioValue": 100000}
```

**Resultado Esperado (CORRETO):**
```json
{"cpf": "12743392436", "hasPrecatorio": true, "precatorioValue": 100000}
```

E disparar o fluxo do Escavador:
```
[Escavador] CPF detectado: 12743392436. Iniciando consulta...
[Escavador] Dados encontrados: X processos
AI calculated new score: 95+ (hot)
```

**Benefício:** Score passaria de 65 (warm) para 95+ (hot) com consulta Escavador!