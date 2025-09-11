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
  - Descarte (0-19pts): Basic information only

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

## Evolution API Integration

The system uses Evolution API for WhatsApp integration:
- **Instance Management**: `/api/evolution/*` routes manage local database + Evolution API
- **Webhook URL**: Must be configured as `{domain}/api/webhook/evolution`
- **Required Events**: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`, `APPLICATION_STARTUP`, `QRCODE_UPDATED`
- **Auto-Response Logic**: Webhook processes messages and calculates lead scores
- **Bot Configuration**: Controls response templates and transfer rules

## UI Component System

Built on Radix UI + Tailwind with custom component library:
- **Design System**: Professional green theme for legal market
- **Responsive Dashboard**: Real-time metrics with Recharts
- **Lead Management**: Classification badges, scoring visualizations
- **Conversation Interface**: WhatsApp-style chat interface
- **Instance Management UI**: `/whatsapp` page with phone number display and connection history
  - Shows instance name + formatted phone number
  - Displays connection history when instances are reused
  - QR code generation and real-time status updates
  - Visual indicators for reconnection vs new connection

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

## Database Considerations

MongoDB schemas use string references instead of ObjectId for TypeScript compatibility. The system includes proper indexing for:
- Lead search and filtering
- Conversation message chronology  
- Performance metrics aggregation
- **WhatsApp Instance Management**: Phone number uniqueness and instance lookups

### Key Database Rules:
- **WhatsAppInstance**: `phoneNumber` field is unique (sparse index) - primary identifier for instances
- **Lead/Conversation**: Use phone numbers consistently for linking conversations to instances
- **Instance Reuse**: Same phone number can be reused by different instance names
- **Soft Delete**: Instances marked `isActive: false` instead of hard deletion
- **Connection History**: Maintained in `connectionHistory[]` array for audit trail

## Testing and Deployment

The system includes mock data fallbacks for development and can be tested locally with the admin user created by `scripts/create-admin.js`. Production deployment requires proper MongoDB and Evolution API configuration.