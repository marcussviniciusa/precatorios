# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a complete WhatsApp chatbot system for the Brazilian "precatórios" (government debt) market, built with Next.js 14, TypeScript, MongoDB, and Evolution API integration. The system automatically qualifies leads through WhatsApp conversations and manages them through a full CRM pipeline.

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run type-check       # Run TypeScript type checking
npm run lint             # Run ESLint

# Database initialization
node scripts/create-admin.js  # Create initial admin user (admin@demo.com / 123456)
```

## Core Architecture

### Lead Qualification System
The system's core functionality revolves around automatic lead scoring and classification:

- **Scoring Algorithm** (`src/lib/utils.ts`): 
  - Possui precatório: +50pts
  - Precatório elegível: +25pts  
  - Urgência alta: +15pts
  - Documentos enviados: +10pts

- **Classification Tiers**:
  - Hot (80-100pts): Immediate analysis
  - Warm (50-79pts): Human follow-up
  - Cold (20-49pts): Educational nurturing
  - Discard (0-19pts): Basic information only

### WhatsApp Integration Flow
1. **Instance Connection** (`/api/evolution/connect/[instance]`): Generates QR code and extracts phone number
2. **Phone Number Extraction** (`src/lib/whatsapp-utils.ts`): Extracts clean phone from `ownerJid`
3. **Instance Binding**: Links phone number to instance, manages conflicts with existing numbers
4. **Webhook Reception** (`/api/webhook/evolution`): Receives WhatsApp messages by phone number
5. **Message Processing**: Extracts information (values, states, urgency keywords)
6. **Lead Scoring**: Automatically calculates and updates lead scores
7. **Bot Response**: Contextual automatic responses based on qualification
8. **Real-time Broadcasting**: Messages instantly broadcast via WebSocket to connected clients
9. **Transfer Logic**: Routes high-scoring leads to human agents

### Data Models Architecture
Key entities (`src/types/index.ts`, `src/models/`):

- **Lead**: Core entity with scoring, classification, and precatório details
- **Conversation**: WhatsApp conversation management with message history
- **WhatsAppInstance**: WhatsApp instance management with phone-based identification
- **WhatsAppOfficial**: Official WhatsApp Business API accounts management
- **BotConfig**: Dynamic bot behavior configuration (prompts, rules, schedules)
- **Activity**: CRM tasks and interactions tracking
- **User**: Role-based authentication (admin/manager/analyst)

### API Route Structure
- **Authentication**: JWT-based with role permissions
- **Dashboard Stats**: Real-time metrics aggregation from MongoDB
- **Bot Configuration**: Dynamic bot behavior management
- **Webhook Handler**: WhatsApp message processing and auto-qualification
- **Instance Management**: `/api/evolution/*` routes for WhatsApp instance CRUD operations
  - `GET /api/evolution/instances`: List app-managed instances only
  - `POST /api/evolution/create-instance`: Create instance in Evolution API + local DB
  - `GET /api/evolution/connect/[instance]`: Generate QR code and extract phone number
  - `GET /api/evolution/status/[instance]`: Check connection status and update phone binding
  - `DELETE /api/evolution/delete/[instance]`: Soft delete instance from local DB
- **Official WhatsApp API**: `/api/whatsapp-official/*` routes for Meta Business accounts
  - `GET /api/whatsapp-official/accounts`: List configured official accounts
  - `POST /api/whatsapp-official/accounts`: Create new official account
  - `PUT /api/whatsapp-official/accounts/[id]`: Update official account
  - `DELETE /api/whatsapp-official/accounts/[id]`: Delete official account
  - `POST /api/whatsapp-official/test-webhook/[id]`: Test account connectivity
- **Message Broadcasting**: `/api/broadcast/*` routes for mass message sending
  - `POST /api/broadcast/send`: Send bulk messages via Evolution API or Official API

## Environment Configuration

Essential environment variables in `.env.local`:
- `MONGODB_URI`: MongoDB connection string
- `EVOLUTION_API_URL`: WhatsApp Evolution API endpoint
- `EVOLUTION_API_KEY`: Evolution API authentication key
- `NEXTAUTH_URL`: Base URL for webhook configuration (auto-configures webhook endpoints)
- `JWT_SECRET`: JWT token signing secret

**Note**: `EVOLUTION_INSTANCE_NAME` is no longer used - instances are now managed dynamically through the `/whatsapp` interface.

## WhatsApp Instance Management

The system implements phone-number-based instance management:
- **Phone as Primary Key**: Instances are identified by connected phone number, not instance name
- **Instance Continuity**: When recreating instances with same phone number, conversation history is preserved
- **Automatic Reactivation**: Creating instance with existing name reactivates previous configuration
- **Connection History**: Tracks all instance names that used the same phone number

### Instance Lifecycle:
1. **Creation**: Instance created with unique name in database (`WhatsAppInstance`)
2. **Connection**: When connected, extracts phone number from `ownerJid`
3. **Phone Binding**: Associates phone number with instance, deactivates conflicting instances
4. **History Preservation**: Conversations linked to phone number, not instance name
5. **Reactivation**: New instances with same phone inherit complete conversation history

## WhatsApp Integration Options

The system supports dual WhatsApp integration approaches:

### Evolution API Integration
- **Instance Management**: `/api/evolution/*` routes manage local database + Evolution API
- **Webhook URL**: Must be configured as `{domain}/api/webhook/evolution`
- **Required Events**: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`, `APPLICATION_STARTUP`, `QRCODE_UPDATED`
- **Auto-Response Logic**: Webhook processes messages and calculates lead scores
- **Bot Configuration**: Controls response templates and transfer rules
- **Message Management**: Mark messages as read to prevent Evolution API retries

### WhatsApp Official API Integration
- **Business Accounts**: `/api/whatsapp-official/*` routes manage Meta Business accounts
- **Webhook URL**: Must be configured as `{domain}/api/webhook/whatsapp-official`
- **Token Verification**: Each account has unique webhook verification token
- **Message Processing**: Handles all message types (text, media, location, etc.)
- **Statistics Tracking**: Monitors sent/received message counts per account
- **API Compliance**: Full compliance with Meta's WhatsApp Business Platform

### Evolution API Troubleshooting
When deleting leads but still receiving webhook messages:
```bash
# Mark specific message as read to stop retries
curl -X POST "${EVOLUTION_API_URL}/chat/markMessageAsRead/INSTANCE_NAME" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "readMessages": [
      {
        "remoteJid": "PHONE_NUMBER@s.whatsapp.net",
        "fromMe": false,
        "id": "MESSAGE_ID"
      }
    ]
  }'
```

## AI Integration System

The system includes a complete AI integration for intelligent lead processing using OpenRouter API:

### AI Configuration (`/config/ai`)
- **Provider**: OpenRouter (supports multiple LLM models)
- **Dual Model Architecture**:
  - `analysisModel`: For extraction, scoring, and transfer decisions
  - `responseModel`: For customer conversation (can be faster/cheaper)
- **Custom Prompts**: Fully customizable prompts for each AI function
- **Toggle Controls**: Enable/disable specific AI features

### AI Service (`src/lib/ai-service.ts`)
The `PrecatoriosAI` class provides specialized methods:
- **`extractLeadInfo()`**: Extracts lead data from messages (name, phone, precatório value, state, urgency)
- **`calculateScore()`**: Calculates lead score 0-100 and classification (hot/warm/cold/discard)
- **`shouldTransfer()`**: Decides when to transfer to human agents
- **`generateResponse()`**: Creates contextual responses for customers

### AI Workflow in Webhook
1. **Message Reception**: WhatsApp message received via webhook
2. **Information Extraction**: AI extracts structured data from message
3. **Lead Scoring**: AI calculates score and updates classification
4. **Transfer Decision**: AI determines if human intervention needed
5. **Response Generation**: AI creates appropriate response
6. **Message Sending**: Response sent via Evolution API

### AI Configuration Options
- **Auto-Extraction**: Automatically extract lead information
- **Auto-Scoring**: Automatically calculate and update lead scores
- **Auto-Transfer**: Automatically decide when to transfer to humans
- **Temperature**: Control response creativity (0.1-1.0)
- **Max Tokens**: Limit response length (50-2000 tokens)

## Message Broadcasting System

The system provides comprehensive message broadcasting capabilities through the `/broadcast` interface:

### Broadcasting Features (`/broadcast`)
- **Dual Source Support**: Choose between Evolution API instances or Official WhatsApp accounts
- **Individual Numbers**: Manually add phone numbers one by one
- **CSV Upload**: Bulk upload via CSV file with automatic phone number parsing
- **Message Composition**: Rich text editor with character count
- **Real-time Results**: Live statistics showing success/failure rates
- **Detailed Reporting**: Per-number delivery status with error details

### Broadcast Workflow
1. **Source Selection**: Choose Evolution API instance or Official WhatsApp account
2. **Message Creation**: Compose the message text (supports emojis and formatting)
3. **Recipient Management**: Add numbers manually or upload CSV file
4. **Validation**: System validates numbers and account status
5. **Batch Processing**: Messages sent with rate limiting (100ms delay between sends)
6. **Lead Integration**: Automatically creates leads for new numbers
7. **Conversation Tracking**: All broadcast messages are saved to conversation history

### Broadcast API (`/api/broadcast/send`)
```json
{
  "source": "evolution" | "official",
  "instanceId": "string", // Required for Evolution API
  "officialAccountId": "string", // Required for Official API
  "message": "string",
  "phones": ["string[]"]
}
```

### CSV Format Requirements
- **Single Column**: Phone numbers only (no headers required)
- **Clean Numbers**: Digits only, no symbols (e.g., 5511999999999)
- **International Format**: Include country code (55 for Brazil)
- **File Size**: Maximum 1000 numbers per broadcast for performance

### Broadcasting Safeguards
- **Rate Limiting**: 100ms delay between messages to prevent API throttling
- **Number Validation**: Automatic formatting and validation of phone numbers
- **Account Verification**: Checks that selected instance/account is active
- **Error Handling**: Graceful failure handling with detailed error messages
- **Message Limits**: Maximum 1000 recipients per broadcast operation

### Lead Generation from Broadcasts
- **Automatic Lead Creation**: New phone numbers automatically become leads
- **Source Tracking**: Leads marked with source 'broadcast' or 'broadcast_official'
- **Conversation History**: All broadcast messages saved to conversation records
- **AI Integration**: Responses to broadcast messages enter normal AI workflow

## WhatsApp Official API Management

The system provides complete management of Meta WhatsApp Business accounts through the `/whatsapp-official` interface:

### Official Account Configuration (`/whatsapp-official`)
- **Account Management**: Create, edit, and delete Official WhatsApp Business accounts
- **Multi-Account Support**: Manage multiple business phone numbers simultaneously
- **Credential Security**: Secure storage of access tokens with masked display
- **Connection Testing**: Built-in connectivity verification with Meta's API
- **Webhook Configuration**: Automatic webhook setup with unique verification tokens
- **Usage Statistics**: Track sent/received message counts per account

### Required Meta Setup Information
- **Phone Number ID**: Unique identifier from Meta Business Manager
- **Access Token**: Long-lived access token from Meta Developer Console
- **Business Account ID**: WhatsApp Business Account identifier (optional)
- **Webhook URL**: Automatically configured as `{domain}/api/webhook/whatsapp-official`
- **Webhook Token**: Auto-generated unique verification token per account

### Account Management Features
- **Visual Status Indicators**: Active/inactive account badges
- **Last Used Tracking**: Monitor account activity with timestamps
- **Bulk Operations**: Enable/disable multiple accounts simultaneously
- **Connection Health**: Real-time API connectivity verification
- **Error Diagnostics**: Detailed error messages with troubleshooting suggestions

### Meta Developer Console Setup Guide
1. **Create Meta App**: Visit [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. **Add WhatsApp Product**: Select "WhatsApp Business" from product catalog
3. **Configure Business Account**: Set up WhatsApp Business Account in Meta Business Manager
4. **Generate Access Token**: Create long-lived user access token with required permissions
5. **Obtain Phone Number ID**: Copy Phone Number ID from WhatsApp > Getting Started
6. **Configure Webhook**: Set webhook URL to `{your-domain}/api/webhook/whatsapp-official`
7. **Verify Webhook**: Use the auto-generated webhook token for verification
8. **Grant Permissions**: Ensure `whatsapp_business_messaging` permission is approved

### Required Permissions
- **`whatsapp_business_messaging`**: Send and receive messages
- **`whatsapp_business_management`**: Manage business account settings
- **Advanced Access**: Required for production use (submit for App Review)

### Webhook Event Processing
The system automatically processes these webhook events:
- **Messages**: Text, images, videos, audio, documents, locations
- **Message Status**: Sent, delivered, read, failed states
- **Contact Updates**: Profile name and picture changes
- **Business Profile**: Updates to business information

### Official API vs Evolution API
| Feature | Official API | Evolution API |
|---------|--------------|---------------|
| **Reliability** | Meta-guaranteed uptime | Third-party dependency |
| **Compliance** | Full WhatsApp ToS compliance | May violate ToS |
| **Setup Complexity** | Business verification required | Simple QR code |
| **Message Limits** | Official rate limits | Unlimited (risk of ban) |
| **Features** | Limited to approved features | Full WhatsApp Web features |
| **Cost** | Per-conversation pricing | Free (hosting costs only) |
| **Business Support** | Official Meta support | Community support |

## Real-time WebSocket System

The system implements a complete real-time messaging infrastructure using Socket.IO:

### WebSocket Architecture
- **Server Implementation** (`src/lib/websocket.ts`): Global singleton Socket.IO server with event broadcasting
- **Client Hook** (`src/hooks/useWebSocket.ts`): React hook for WebSocket connection management
- **API Endpoint** (`/src/pages/api/socketio.ts`): Socket.IO server initialization endpoint

### Real-time Features
- **Instant Message Updates**: WhatsApp messages appear immediately in the web interface
- **Room-based Broadcasting**: Clients join conversation-specific rooms for targeted updates
- **Connection Status**: Visual indicators showing real-time connection status
- **Agent Message Sync**: Messages sent by agents broadcast instantly to all connected clients
- **Conversation Management**: Real-time updates for conversation deletion and status changes

### WebSocket Events
- `new-message`: Broadcasts new messages to conversation participants
- `conversation-updated`: Updates conversation metadata (last message, timestamps)
- `conversation-deleted`: Notifies clients when conversations are removed
- `instance-status-changed`: Updates WhatsApp instance connection status

### Implementation Notes
- **Singleton Pattern**: Uses `globalForSocket.socketio` to maintain single WebSocket server instance
- **Webhook Integration**: All webhook endpoints broadcast events via WebSocket after database operations
- **Client Management**: Automatic room joining/leaving when users navigate between conversations
- **Reconnection Logic**: Built-in reconnection and connection stability management

### WebSocket Initialization
The WebSocket server must be initialized via `/api/socketio` endpoint before webhooks can broadcast events:
```bash
curl http://localhost:3000/api/socketio
```

## UI Component System

Built on Radix UI + Tailwind with custom component library:
- **Design System**: Professional green theme for legal market
- **Responsive Dashboard**: Real-time metrics with Recharts
- **Lead Management**: Classification badges, scoring visualizations
- **Conversation Interface**: WhatsApp-style chat interface with real-time message updates
- **Instance Management UI**: `/whatsapp` page with phone number display and connection history
  - Shows instance name + formatted phone number
  - Displays connection history when instances are reused
  - QR code generation and real-time status updates
  - Visual indicators for reconnection vs new connection
- **Message Broadcasting UI**: `/broadcast` page for mass message sending
  - Dual source selection (Evolution API vs Official API)
  - CSV upload with drag-and-drop interface
  - Manual phone number management with add/remove controls
  - Real-time broadcast results with success/failure statistics
  - Message composition with character counter
- **Official WhatsApp Management UI**: `/whatsapp-official` page for Meta Business accounts
  - Account creation and editing forms with validation
  - Connection testing with detailed error diagnostics
  - Webhook configuration with auto-generated tokens
  - Usage statistics and last activity tracking
  - Step-by-step setup documentation with external links
- **Real-time Indicators**: WebSocket connection status displayed throughout the interface

### Layout Architecture
The system uses Next.js Route Groups for consistent navigation:
- **Route Group Structure**: All dashboard pages are organized under `(dashboard)` route group
- **Shared Layout**: All pages automatically inherit the sidebar navigation via `src/app/(dashboard)/layout.tsx`
- **Fixed Sidebar**: Sidebar uses `fixed h-screen` positioning for consistent height across all pages
- **Layout Classes**: Main content area uses `ml-64` margin to accommodate fixed sidebar width

**IMPORTANT RULE**: When creating new pages, they MUST be placed inside the `src/app/(dashboard)/` directory to inherit the shared layout with sidebar navigation. Pages outside this directory will not have the lateral menu.

## Key Business Logic

### Automatic Lead Qualification
The webhook handler (`/api/webhook/evolution`) contains sophisticated text analysis that:
- Detects precatório mentions and extracts values using regex
- Identifies urgency keywords and geographic information
- Updates lead scores in real-time
- Triggers appropriate bot responses based on classification
- Broadcasts all message updates via WebSocket for real-time interface updates

### Bot Response Logic
Contextual responses based on:
- Lead classification level
- Previous interaction history  
- Configurable prompts and templates
- Transfer rules (score thresholds, keyword triggers)

### CRM Pipeline Management
- Status progression: new → qualified → in_analysis → proposal → closed
- Activity tracking with assignments and due dates
- Conversion funnel visualization
- Performance metrics calculation

## Lead Management System

### Lead Deletion (`/api/leads/[leadId]/delete`)
Complete lead deletion system that removes all associated data:
- **Lead record**: Primary lead information
- **All conversations**: Complete chat history
- **All activities**: CRM tasks and interactions
- **Message history**: All WhatsApp messages
- **Secure deletion**: Requires authentication and confirmation

### Lead Management UI (`/leads`)
- **Delete button**: Red trash icon with hover effects
- **Confirmation modal**: Double-confirmation with detailed warning
- **Batch operations**: Multiple lead selection for bulk actions
- **Real-time updates**: Automatic list refresh after operations
- **Search and filters**: Advanced filtering by classification, status, etc.

### Lead Classification System
All lead classifications use consistent English terms:
- **`'hot'`**: High-value, immediate attention leads
- **`'warm'`**: Qualified leads needing follow-up  
- **`'cold'`**: Low-priority leads for nurturing
- **`'discard'`**: Unqualified leads for basic info only

**IMPORTANT**: Always use English classification terms (`'discard'` not `'descarte'`) to maintain database consistency.

## Database Considerations

MongoDB schemas use string references instead of ObjectId for TypeScript compatibility. The system includes proper indexing for:
- Lead search and filtering
- Conversation message chronology  
- Performance metrics aggregation
- **WhatsApp Instance Management**: Phone number uniqueness and instance lookups

### Key Database Rules:
- **WhatsAppInstance**: `phoneNumber` field is unique (sparse index) - primary identifier for instances
- **WhatsAppOfficial**: `phoneNumberId` field is unique - primary identifier for official accounts
- **Lead/Conversation**: Use phone numbers consistently for linking conversations to instances
- **Instance Reuse**: Same phone number can be reused by different instance names
- **Soft Delete**: Instances marked `isActive: false` instead of hard deletion
- **Connection History**: Maintained in `connectionHistory[]` array for audit trail
- **Statistics Tracking**: Message counts and timestamps stored in `stats` subdocuments

## Testing and Deployment

The system includes mock data fallbacks for development and can be tested locally with the admin user created by `scripts/create-admin.js`. Production deployment requires proper MongoDB and Evolution API configuration.

### Development Setup
1. Start the development server: `npm run dev`
2. Initialize WebSocket server: `curl http://localhost:3000/api/socketio`
3. Configure Evolution API webhook to point to your domain: `{domain}/api/webhook/evolution`
4. Test real-time messaging by sending WhatsApp messages to connected instances

### Real-time System Dependencies
- **Socket.IO**: Real-time WebSocket communication (`socket.io`, `socket.io-client`)
- **WebSocket Server**: Must be initialized before webhook events for proper message broadcasting
- **Client Connection**: Browsers automatically connect to WebSocket server on conversation page load

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Webhook Receiving Messages from Deleted Leads
**Problem**: After deleting a lead, Evolution API continues sending webhook messages.
**Solution**: Mark the specific message as read using Evolution API:
```bash
curl -X POST "${EVOLUTION_API_URL}/chat/markMessageAsRead/INSTANCE_NAME" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"readMessages": [{"remoteJid": "PHONE@s.whatsapp.net", "fromMe": false, "id": "MESSAGE_ID"}]}'
```

#### 2. Classification Validation Errors
**Problem**: `ValidationError: 'descarte' is not a valid enum value`
**Solution**: Always use English terms (`'discard'` not `'descarte'`). Update existing records:
- Check database for leads with old classification terms
- Update via direct database query or API endpoints
- Ensure all UI components use consistent English terms

#### 3. AI Not Responding to Messages
**Common causes**:
- IA disabled in `/config/ai`
- Outside working hours (configurable in bot settings)
- Missing API key or incorrect model names
- Lead transferred automatically (check transfer rules)
- Bot reached maximum response limit per conversation

#### 4. WebSocket Connection Issues  
**Problem**: Messages not appearing in real-time
**Solutions**:
- Initialize WebSocket server: `curl http://localhost:3000/api/socketio`
- Check browser console for connection errors
- Verify WebSocket server is running before sending webhooks

#### 5. Database Connection Problems
**Common issues**:
- MongoDB URI format incorrect
- Network connectivity to database server
- Authentication credentials expired
- Database connection pool exhausted (restart server)

#### 6. WhatsApp Official API Issues
**Problem**: Official account connection fails
**Solutions**:
- Verify Access Token hasn't expired (tokens last 60 days)
- Check Phone Number ID is correct in Meta Developer Console
- Ensure webhook URL is publicly accessible (use ngrok for testing)
- Confirm webhook token matches the one generated in the interface
- Verify Business Account has required permissions approved

#### 7. Message Broadcasting Failures
**Problem**: Broadcast messages fail to send
**Common causes**:
- Selected instance/account is disconnected or inactive
- Rate limiting by WhatsApp (too many messages too quickly)
- Invalid phone numbers in the recipient list
- Access token expired for Official API accounts
- Instance banned or suspended for policy violations

**Solutions**:
- Test instance/account connectivity before broadcasting
- Reduce broadcast size or add delays between batches
- Validate phone number format (international format with country code)
- Refresh access tokens in Official API accounts
- Use Official API for better compliance and reliability

#### 8. CSV Upload Issues
**Problem**: CSV file not processing correctly
**Solutions**:
- Ensure file is saved as CSV format (not Excel)
- Use single column with phone numbers only
- Remove headers and formatting from the file
- Check for special characters or non-numeric data
- Validate file size doesn't exceed browser limits