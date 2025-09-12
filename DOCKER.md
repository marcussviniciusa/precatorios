# Docker Configuration - Precatórios WhatsApp Bot

Este documento descreve como usar Docker para deployar o sistema de chatbot do WhatsApp para precatórios.

## Configuração para Produção

### Pré-requisitos

- Docker e Docker Compose instalados
- Traefik configurado como proxy reverso
- MongoDB já instalado e rodando no servidor
- Domínio configurado com DNS apontando para o servidor

### Arquivos de Configuração

O projeto inclui os seguintes arquivos Docker:

- `Dockerfile` - Imagem de produção otimizada
- `docker-compose.yml` - Configuração de produção com Traefik
- `docker-compose.dev.yml` - Configuração de desenvolvimento
- `.dockerignore` - Arquivos ignorados durante o build
- `.env.docker` - Template de variáveis de ambiente

### Deploy de Produção

1. **Copie e configure as variáveis de ambiente:**
```bash
cp .env.docker .env
```

2. **Edite o arquivo `.env` com suas configurações:**
```bash
# Domain Configuration
DOMAIN=precatorios.exemplo.com

# External MongoDB Configuration
MONGODB_URI=mongodb://precatorios_user:senha123@10.0.0.100:27017/precatorios5?authSource=admin

# Application Configuration
NEXTAUTH_SECRET=sua-chave-secreta-nextauth-minimo-32-caracteres
JWT_SECRET=sua-chave-secreta-jwt

# Evolution API Configuration
EVOLUTION_API_URL=https://api.marcussviniciusa.cloud
EVOLUTION_API_KEY=sua-chave-evolution-api

# MinIO Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=senha-segura-minio
MINIO_ENDPOINT=s3.precatorios.exemplo.com

# OpenAI Configuration (opcional)
OPENAI_API_KEY=sua-chave-openai
```

3. **Execute o deploy:**
```bash
docker-compose up -d
```

### Configuração do Traefik

O `docker-compose.yml` já inclui as labels necessárias para o Traefik:

- **Aplicação principal:** `https://seu-dominio.com`
- **MinIO API:** `https://minio.seu-dominio.com`
- **MinIO Console:** `https://minio-console.seu-dominio.com`

Certifique-se de que:
- A rede `traefik` existe externamente
- O Traefik está configurado com Let's Encrypt (`letsencrypt` resolver)

### Configuração do MongoDB Externo

Como o MongoDB já está instalado no servidor, você precisa:

1. **Criar o banco e usuário para a aplicação:**
```javascript
// Conecte no MongoDB e execute:
use precatorios5

db.createUser({
  user: "precatorios_user",
  pwd: "senha_segura",
  roles: [
    { role: "readWrite", db: "precatorios5" }
  ]
})
```

2. **Configurar a URI no `.env`:**
```bash
MONGODB_URI=mongodb://precatorios_user:senha_segura@localhost:27017/precatorios5?authSource=admin
```

## Desenvolvimento Local

Para desenvolvimento local com MongoDB e MinIO containerizados:

1. **Use o docker-compose de desenvolvimento:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. **Acesse a aplicação:**
- App: http://localhost:3000
- MinIO Console: http://localhost:9001
- MongoDB: localhost:27017

## Comandos Úteis

### Logs
```bash
# Ver logs da aplicação
docker logs precatorios-app -f

# Ver logs do MinIO
docker logs precatorios-minio -f
```

### Rebuild
```bash
# Rebuild apenas a aplicação
docker-compose up -d --build app

# Rebuild completo
docker-compose down && docker-compose up -d --build
```

### Backup
```bash
# Backup do volume MinIO
docker run --rm -v precatorios5_minio_data:/data -v $(pwd)/backup:/backup alpine tar -czf /backup/minio-$(date +%Y%m%d).tar.gz -C /data .
```

### Limpeza
```bash
# Parar e remover containers
docker-compose down

# Remover volumes (CUIDADO!)
docker-compose down -v

# Limpeza geral
docker system prune -a
```

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão com MongoDB:**
   - Verifique se a URI está correta no `.env`
   - Teste a conexão: `mongo "sua-uri-aqui"`

2. **Traefik não encontra o serviço:**
   - Verifique se a rede `traefik` existe: `docker network ls`
   - Crie se necessário: `docker network create traefik`

3. **Problema com SSL/TLS:**
   - Verifique se o domínio está apontando para o servidor
   - Aguarde alguns minutos para o Let's Encrypt processar

4. **MinIO não consegue salvar arquivos:**
   - Verifique as permissões do volume
   - Confirme se as credenciais MinIO estão corretas

### Verificação do Status

```bash
# Status dos containers
docker-compose ps

# Logs de erro
docker-compose logs --tail=50

# Teste de conectividade
curl -I https://seu-dominio.com
```

## Estrutura de Volumes

```
volumes:
  minio_data:/data  # Arquivos do MinIO
```

## Rede

O sistema usa a rede externa `traefik` para integração com o proxy reverso.

## Observações Importantes

- **MongoDB Externo:** O sistema não inclui MongoDB containerizado para produção
- **Traefik Obrigatório:** O proxy reverso via Traefik é necessário para HTTPS automático
- **Volumes Persistentes:** Apenas o MinIO tem dados persistentes
- **Scalabilidade:** A aplicação Next.js pode ser escalada horizontalmente se necessário