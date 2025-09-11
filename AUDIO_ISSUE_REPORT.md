# 🎵 Relatório: Problema com Reprodução de Áudio - MinIO Integration

**Data:** 11/09/2025  
**Status:** ❌ Em resolução - Áudio não reproduz na interface  
**Sistema:** WhatsApp Chatbot para Precatórios com MinIO

## 📋 Resumo do Problema

Os arquivos de áudio recebidos via WhatsApp são salvos corretamente no MinIO, mas **não conseguem ser reproduzidos** na interface web devido a problemas de decodificação.

## 🔍 Erro Atual

```javascript
Media resource https://s3.marcussviniciusa.cloud/precatorios-files/audio/2025-09-11T16-57-59-345Z-ko6ype.ogg could not be decoded.
Media resource could not be decoded, error: Error Code: NS_ERROR_DOM_MEDIA_METADATA_ERR (0x806e0006)
```

## 🛠️ Implementações Realizadas

### ✅ Funcionalidades Implementadas
1. **Sistema MinIO Completo** - Arquivos sendo salvos corretamente
2. **URLs Diretas do S3** - Bucket configurado como público
3. **Extensões Corretas** - Arquivos salvos como `.ogg` 
4. **Content-Type Adequado** - `audio/ogg; codecs=opus`
5. **Player de Áudio Melhorado** - Múltiplas fontes e logs de debug
6. **WebSocket Broadcasting** - Mensagens aparecem em tempo real

### 🔄 Fluxo Atual
```
WhatsApp Webhook → Download do arquivo → Upload para MinIO → URL gerada → Interface → ❌ Erro de decodificação
```

## 🎯 Causa Raiz Identificada

**PROBLEMA:** Os arquivos de áudio do WhatsApp vêm **criptografados** (formato `.enc`) e estão sendo salvos no MinIO sem decodificação.

### Evidências:
- URL original do WhatsApp: `...35858565_808207368214176_2554812680164305361_n.enc`
- Arquivo salvo no MinIO: `data` (não é áudio válido)
- Error NS_ERROR_DOM_MEDIA_METADATA_ERR = arquivo corrompido/inválido

## 📁 Arquivos Modificados

### Principais
- `src/lib/minio.ts` - Configuração e upload para MinIO
- `src/app/api/webhook/evolution/route.ts` - Download e salvamento de mídia
- `src/app/(dashboard)/conversations/page.tsx` - Player de áudio melhorado
- `src/app/api/files/[...path]/route.ts` - API para servir arquivos

### Configuração
- `.env.local` - Credenciais MinIO configuradas
- MinIO bucket `precatorios-files` configurado como público

## 🚨 Próxima Ação Necessária

**SOLUÇÃO:** Implementar decodificação dos arquivos de áudio criptografados do WhatsApp.

### Opções:
1. **Usar Evolution API para decodificar** - Fazer requisição autenticada para baixar arquivo já decodificado
2. **Implementar decodificação manual** - Usar `mediaKey` e `fileEncSha256` para descriptografar
3. **Usar URLs diretas do WhatsApp** - Não salvar no MinIO, usar URLs temporárias do WhatsApp

### Código de Referência:
```javascript
// Webhook atual (PROBLEMA):
const mediaResponse = await fetch(whatsappMediaUrl) // ❌ Arquivo criptografado

// Solução sugerida:
const mediaResponse = await fetch(`${EVOLUTION_API_URL}/chat/whatsapp/media`, {
  headers: { 'apikey': EVOLUTION_API_KEY },
  body: { messageId: message.key.id, instanceName }
})
```

## 📊 Status do Sistema

| Componente | Status | Observação |
|------------|--------|------------|
| MinIO Integration | ✅ Funcionando | Arquivos salvos corretamente |
| Bucket Público | ✅ Configurado | URLs acessíveis via HTTP/2 200 |
| Webhook Processing | ✅ Funcionando | Mensagens processadas |
| WebSocket Real-time | ✅ Funcionando | Broadcasting ativo |
| Audio Player UI | ⚠️ Desenvolvido | Interface pronta, mas arquivos inválidos |
| Audio Decoding | ❌ Problema | **BLOQUEADOR PRINCIPAL** |

## 🔧 Comandos para Debug

```bash
# Testar acesso ao arquivo no MinIO
curl -I "https://s3.marcussviniciusa.cloud/precatorios-files/audio/FILENAME.ogg"

# Verificar tipo de arquivo
curl -s "URL_DO_ARQUIVO" | file -

# Verificar logs do webhook
# Procurar por: "Media saved to MinIO: ..."
```

## 📝 Logs de Exemplo

```
Processing individual message from: 558496151588@s.whatsapp.net
Message processed: audio - "[Áudio enviado]" from 558496151588
Attempting to download media from: https://mmg.whatsapp.net/v/t62.7117-24/...n.enc
Buffer uploaded successfully to MinIO: audio/2025-09-11T16-57-59-345Z-ko6ype.ogg
Media saved to MinIO: https://s3.marcussviniciusa.cloud/precatorios-files/audio/...
```

## 🎯 Resumo para Continuação

**O sistema MinIO está 100% funcional**, mas os arquivos de áudio do WhatsApp chegam **criptografados** e precisam ser **decodificados** antes de serem salvos no MinIO. A próxima implementação deve focar na **decodificação correta dos arquivos de mídia** utilizando a Evolution API ou implementando decodificação manual.

---
*Relatório gerado automaticamente - System funcionando exceto reprodução de áudio*