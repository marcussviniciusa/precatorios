# Sistema de Chatbot para Precatórios

Sistema completo de gestão de leads e atendimento via WhatsApp para o mercado de precatórios, construído com Next.js 14, TypeScript e MongoDB.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Dashboard Completo**: Métricas em tempo real, gráficos de conversão e atividades
- **Gestão de Conversas**: Interface completa para acompanhar conversas do WhatsApp
- **Sistema de Leads**: Qualificação automática com pontuação de 0-100
- **CRM Integrado**: Pipeline de vendas e gestão de atividades
- **Motor de IA**: Processamento de mensagens com qualificação automática
- **Evolution API**: Integração completa para WhatsApp
- **Autenticação**: Sistema JWT com diferentes perfis de usuário
- **Configurações**: Interface para personalizar comportamento do bot

### 🎯 Sistema de Qualificação
- **Hot (80-100pts)**: Análise imediata
- **Warm (50-79pts)**: Acompanhamento humano  
- **Cold (20-49pts)**: Nutrição educativa
- **Descarte (0-19pts)**: Informações básicas

### 📊 Critérios de Pontuação
- Possui precatório: +50pts
- Precatório elegível: +25pts
- Urgência alta: +15pts
- Documentos enviados: +10pts

## 🛠 Tecnologias

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Banco de Dados**: MongoDB com Mongoose
- **Autenticação**: JWT
- **WhatsApp**: Evolution API
- **Gráficos**: Recharts
- **UI Components**: Radix UI + Tailwind

## 📋 Pré-requisitos

- Node.js 18+ 
- MongoDB
- Evolution API configurada

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd precatorios5
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.local .env.local
# Edite o arquivo com suas configurações
```

4. Configure o MongoDB:
```bash
# Certifique-se que o MongoDB está rodando
# Atualize MONGODB_URI no .env.local
```

5. Inicie a aplicação:
```bash
npm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente (.env.local)
```bash
MONGODB_URI=mongodb://localhost:27017/precatorios-chatbot
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key
EVOLUTION_INSTANCE_NAME=your-instance-name
JWT_SECRET=your-jwt-secret-key
```

### Evolution API
1. Configure sua instância da Evolution API
2. Configure o webhook para: `http://seu-dominio.com/api/webhook/evolution`
3. Ative os eventos: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`

## 📱 Uso

### Login Demo
- **Email**: admin@demo.com
- **Senha**: 123456

### Fluxo do Bot
1. **Recepção**: Mensagem recebida via Evolution API
2. **Processamento**: IA analisa e extrai informações
3. **Qualificação**: Sistema calcula score e classifica lead
4. **Resposta**: Bot responde automaticamente
5. **Transferência**: Leads quentes são transferidos para humanos

### Configuração do Bot
- Acesse `/config` para personalizar:
  - Mensagens automáticas
  - Horários de funcionamento
  - Critérios de elegibilidade
  - Regras de transferência

## 📚 Estrutura do Projeto

```
src/
├── app/                 # App Router (Next.js 14)
│   ├── api/            # API Routes
│   ├── dashboard/      # Dashboard principal
│   ├── conversations/  # Gestão de conversas
│   ├── leads/         # Gestão de leads
│   ├── crm/           # CRM e pipeline
│   └── config/        # Configurações
├── components/         # Componentes React
│   ├── ui/            # Componentes básicos
│   ├── layout/        # Layout e navegação
│   └── dashboard/     # Componentes específicos
├── lib/               # Utilitários e configurações
├── models/            # Modelos do MongoDB
└── types/             # Tipos TypeScript
```

## 🔄 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Dashboard
- `GET /api/dashboard/stats` - Métricas do dashboard

### Configuração
- `GET /api/config/bot` - Obter configurações
- `POST /api/config/bot` - Salvar configurações

### Webhook
- `POST /api/webhook/evolution` - Receber mensagens do WhatsApp

## 🎨 Interface

O sistema possui uma interface moderna e responsiva com:
- **Design System**: Baseado no shadcn/ui
- **Tema Verde**: Cores profissionais para o mercado jurídico
- **Dashboard Responsivo**: Gráficos e métricas em tempo real
- **UX Otimizada**: Interface intuitiva para operadores

## 🔒 Segurança

- Autenticação JWT
- Validação de entrada
- Sanitização de dados
- Controle de acesso por perfil
- Logs de auditoria

## 📈 Monitoramento

O sistema inclui métricas para:
- Taxa de conversão
- Tempo médio de resposta
- Leads qualificados por dia
- Performance do bot
- ROI por canal

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas sobre implementação, entre em contato através dos issues do GitHub.

---

**Desenvolvido com ❤️ para automatizar e otimizar o atendimento no mercado de precatórios.**