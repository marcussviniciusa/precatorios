# Create Instance

## POST /instance/create

### Descrição
Cria uma nova instância da Evolution API.

### Parâmetros (Body - application/json)
- `instanceName` (string, **obrigatório**): Nome da instância.
- `integration` (enum<string>, **obrigatório**): Motor do WhatsApp. Opções disponíveis: `WHATSAPP-BAILEYS`, `WHATSAPP-BUSINESS`.
- `token` (string): Chave API (informe ou deixe vazio para criar dinamicamente).
- `qrcode` (boolean): Cria QR Code automaticamente após a criação.
- `number` (string): Número do proprietário da instância com código do país (ex: 559999999999).
- `rejectCall` (boolean): Rejeita chamadas do WhatsApp automaticamente.
- `msgCall` (string): Mensagem a ser enviada quando uma chamada é rejeitada automaticamente.
- `groupsIgnore` (boolean): Ignora mensagens de grupo.
- `alwaysOnline` (boolean): Mantém o WhatsApp sempre online.
- `readMessages` (boolean): Envia recibos de leitura para mensagens recebidas.
- `readStatus` (boolean): Mostra o status de leitura das mensagens enviadas.
- `syncFullHistory` (boolean): Sincroniza o histórico completo do WhatsApp com a EvolutionAPI.
- `proxyHost` (string): Host do proxy.
- `proxyPort` (string): Porta do proxy.
- `proxyProtocol` (string): Protocolo do proxy.
- `proxyUsername` (string): Usuário do proxy.
- `proxyPassword` (string): Senha do proxy.
- `webhook` (object): URL do Webhook. (Ver atributos filhos na documentação original).
- `rabbitmq` (object): (Ver atributos filhos na documentação original).
- `sqs` (object): Habilita SQS. (Ver atributos filhos na documentação original).
- `chatwootAccountId` (integer): ID da conta Chatwoot.
- `chatwootToken` (string): Token de autenticação Chatwoot.
- `chatwootUrl` (string): URL do servidor Chatwoot.
- `chatwootSignMsg` (boolean): Envia assinatura de mensagem no Chatwoot.
- `chatwootReopenConversation` (boolean): Reabre conversa no Chatwoot.
- `chatwootConversationPending` (boolean): TODO.
- `chatwootImportContacts` (boolean): Importa contatos do Chatwoot.
- `chatwootNameInbox` (string): Nome da caixa de entrada Chatwoot.
- `chatwootMergeBrazilContacts` (boolean): TODO.
- `chatwootImportMessages` (boolean): Importa mensagens do Chatwoot.
- `chatwootDaysLimitImportMessages` (integer): Limite de dias para importação de mensagens Chatwoot.
- `chatwootOrganization` (string): Evolution Bot.
- `chatwootLogo` (string):

### Respostas
- **201 Created** (application/json):
  - `instance` (object): (Ver atributos filhos na documentação original).
  - `hash` (object): (Ver atributos filhos na documentação original).
  - `settings` (object): (Ver atributos filhos na documentação original).
- **403 Forbidden**

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Fetch Instances

## GET /instance/fetchInstances

### Descrição
Busca informações sobre as instâncias da Evolution API.

### Parâmetros (Query Parameters)
- `instanceName` (string): Nome da instância a ser buscada.
- `instanceId` (string): ID da instância a ser buscada.

### Respostas
- **200 OK** (application/json):
  - `status` (integer): O status HTTP da resposta.
  - `error` (string): A mensagem de erro indicando o tipo de erro.
  - `response` (object): (Ver atributos filhos na documentação original).

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Instance Connect

## GET /instance/connect/{instance}

### Descrição
Conecta uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância a ser conectada.

### Parâmetros (Query Parameters)
- `number` (string): Número de telefone (com código do país) a ser conectado.

### Respostas
- **200 OK** (application/json):
  - `pairingCode` (string): O código único usado para emparelhar um dispositivo ou conta.
  - `code` (string): Um código específico associado ao processo de emparelhamento. Isso pode incluir tokens ou outros identificadores.
  - `count` (integer): A contagem ou número de tentativas ou instâncias relacionadas ao processo de emparelhamento.
- **404 Not Found**

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Restart Instance

## PUT /instance/restart/{instance}

### Descrição
Reinicia uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância a ser reiniciada.

### Respostas
- **200 OK** (application/json):
  - `instance` (object):
    - `instanceName` (string): Nome da instância.
    - `state` (string): Estado da instância (ex: "open").
- **404 Not Found**

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Connection State

## GET /instance/connectionState/{instance}

### Descrição
Verifica o estado da conexão de uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância para verificar o estado da conexão.

### Respostas
- **200 OK** (application/json):
  - `instance` (object):
    - `instanceName` (string): Nome da instância.
    - `state` (string): Estado da instância (ex: "open").
- **404 Not Found**

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Logout Instance

## DELETE /instance/logout/{instance}

### Descrição
Desconecta uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância para desconectar.

### Respostas
- **200 OK** (application/json):
  - `status` (string): "SUCCESS" se a operação foi bem-sucedida.
  - `error` (boolean): `false` se não houve erro.
  - `response` (object):
    - `message` (string): Mensagem de sucesso (ex: "Instance logged out").
- **404 Not Found**

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Delete Instance

## DELETE /instance/delete/{instance}

### Descrição
Exclui uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância a ser excluída.

### Respostas
- **200 OK** (application/json):
  - `status` (string): "SUCCESS" se a operação foi bem-sucedida.
  - `error` (boolean): `false` se não houve erro.
  - `response` (object):
    - `message` (string): Mensagem de sucesso (ex: "Instance deleted").
- **404 Not Found**

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Set Presence

## POST /instance/setPresence/{instance}

### Descrição
Define o estado de presença de uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância para definir a presença.

### Parâmetros (Body - application/json)
- `presence` (string, **obrigatório**): Estado de presença. Ex: "available".

### Respostas
- **200 OK**
- **404 Not Found**

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Send Plain Text

## POST /message/sendText/{instance}

### Descrição
Envia uma mensagem de texto simples através de uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância.

### Parâmetros (Body - application/json)
- `number` (string, **obrigatório**): Número para receber a mensagem (com código do país).
- `text` (string, **obrigatório**): Mensagem de texto a ser enviada.
- `delay` (integer): Tempo de presença em milissegundos antes de enviar a mensagem.
- `linkPreview` (boolean): Mostra uma prévia do site de destino se houver um link na mensagem.
- `mentionsEveryOne` (boolean): Menciona todos quando a mensagem é enviada.
- `mentioned` (enum<string>[]): Números a serem mencionados.
- `quoted` (object): (Ver atributos filhos na documentação original).

### Respostas
- **201 Created** (application/json):
  - `key` (object): (Ver atributos filhos na documentação original).
  - `message` (object): (Ver atributos filhos na documentação original).
  - `messageTimestamp` (string): O timestamp da mensagem.
  - `status` (string): O status da mensagem.

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Send Media

## POST /message/sendMedia/{instance}

### Descrição
Envia uma mensagem de mídia (imagem, vídeo ou documento) através de uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): Nome da instância.

### Parâmetros (Body - application/json)
- `number` (string, **obrigatório**): Número para receber a mensagem (com código do país).
- `mediatype` (string, **obrigatório**): Tipo de mídia (Image, video ou document).
- `mimetype` (string, **obrigatório**): Tipo MIME da mídia (ex: image/png).
- `caption` (string, **obrigatório**): Legenda da mídia.
- `media` (string, **obrigatório**): URL ou base64 da mídia.
- `fileName` (string, **obrigatório**): Nome do arquivo (ex: Image.png).
- `delay` (integer): Tempo de presença em milissegundos antes de enviar a mensagem.
- `linkPreview` (boolean): Mostra uma prévia do site de destino se houver um link na mensagem.
- `mentionsEveryOne` (boolean): Menciona todos quando a mensagem é enviada.
- `mentioned` (enum<string>[]): Números a serem mencionados.
- `quoted` (object): (Ver atributos filhos na documentação original).

### Respostas
- **201 Created** (application/json):
  - `key` (object): A chave da mensagem, que identifica a mensagem no chat.
  - `message` (object): O conteúdo da mensagem, que pode incluir vários tipos de mensagens como texto, imagens, etc.
  - `messageTimestamp` (string): O timestamp da mensagem, representado como uma string.
  - `status` (string): O status da mensagem, como enviada, recebida ou pendente.

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.




# Send WhatsApp Audio

## POST /message/sendWhatsAppAudio/{instance}

### Descrição
Envia uma mensagem de áudio através de uma instância da Evolution API.

### Parâmetros (Path Parameters)
- `instance` (string, **obrigatório**): ID da instância para conectar.

### Parâmetros (Body - application/json)
- `number` (string, **obrigatório**): Número para receber a mensagem (com código do país).
- `audio` (string, **obrigatório**): URL ou base64 do áudio.
- `delay` (integer): Tempo de presença em milissegundos antes de enviar a mensagem.
- `linkPreview` (boolean): Mostra uma prévia do site de destino se houver um link na mensagem.
- `mentionsEveryOne` (boolean): Menciona todos quando a mensagem é enviada.
- `mentioned` (enum<string>[]): Números a serem mencionados.
- `quoted` (object): (Ver atributos filhos na documentação original).

### Respostas
- **200 OK** (application/json):
  - `key` (object): A chave da mensagem, que identifica a mensagem no chat.
  - `message` (object): O conteúdo da mensagem, que pode incluir vários tipos de mensagens como texto, imagens, áudio, etc.
  - `messageTimestamp` (string): O timestamp da mensagem, representado como uma string.
  - `status` (string): O status da mensagem, como enviada, recebida ou pendente.

### Autorizações
- `apikey` (string, header, **obrigatório**): Sua chave de autorização no cabeçalho.

