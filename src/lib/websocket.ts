import { Server } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'

export type WebSocketEvent =
  | 'new-message'
  | 'conversation-updated'
  | 'conversation-deleted'
  | 'instance-status-changed'
  | 'notification'
  | 'queue-updated'
  | 'agent-status-changed'

export interface NewMessageEvent {
  conversationId: string
  message: any
}

export interface ConversationUpdatedEvent {
  conversationId: string
  conversation: any
}

export interface ConversationDeletedEvent {
  conversationId: string
}

export interface InstanceStatusChangedEvent {
  instanceName: string
  status: string
  phoneNumber?: string
}

export interface NotificationEvent {
  type: 'new_transfer' | 'direct_assignment' | 'queue_update' | 'system_alert'
  userId?: string // Para notificações direcionadas
  priority?: 'low' | 'medium' | 'high'
  data: any
}

export interface QueueUpdatedEvent {
  action: 'added' | 'removed' | 'assigned' | 'priority_changed'
  conversationId: string
  position?: number
  stats?: any
}

export interface AgentStatusChangedEvent {
  agentId: string
  status: 'online' | 'offline' | 'busy' | 'available'
  activeConversations?: number
}

// Global variable declaration for proper singleton
declare global {
  var __socketio: Server | undefined
}

// Global instance for the socket server - using global to prevent re-initialization
const globalForSocket = globalThis as unknown as {
  socketio: Server | undefined
}

export const getSocketServer = (): Server | null => {
  return globalForSocket.socketio || null
}

export const initializeSocketServer = (res: NextApiResponse): Server => {
  if (!globalForSocket.socketio) {
    const httpServer = (res.socket as any).server
    
    globalForSocket.socketio = new Server(httpServer, {
      path: '/api/socketio',
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      transports: ['polling', 'websocket']
    })

    globalForSocket.socketio.on('connection', (socket) => {
      console.log('Client connected to WebSocket:', socket.id)

      // Join conversation rooms for targeted updates
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`)
        console.log(`Client ${socket.id} joined conversation:${conversationId}`)
      })

      // Leave conversation rooms
      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`)
        console.log(`Client ${socket.id} left conversation:${conversationId}`)
      })

      // Join user-specific room for notifications
      socket.on('join-user', (userId: string) => {
        socket.join(`user:${userId}`)
        console.log(`Client ${socket.id} joined user:${userId}`)
      })

      // Join agent queue room
      socket.on('join-queue', () => {
        socket.join('queue:agents')
        console.log(`Client ${socket.id} joined queue:agents`)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected from WebSocket:', socket.id)
      })
    })

    console.log('Socket.IO server initialized')
  }
  
  return globalForSocket.socketio
}

// Emit events to all connected clients
export const broadcastNewMessage = (conversationId: string, message: any) => {
  const io = globalForSocket.socketio
  if (io) {
    // Send to specific conversation room
    io.to(`conversation:${conversationId}`).emit('new-message', {
      conversationId,
      message
    })
    
    // Also send to general room for conversation list updates
    io.emit('conversation-updated', {
      conversationId,
      lastMessage: message.content,
      lastMessageTime: message.timestamp,
      isUserMessage: message.sender === 'user'
    })
    
    console.log(`Broadcasted new message to conversation:${conversationId}`)
  } else {
    console.log('WebSocket server not initialized, message not broadcasted')
  }
}

export const broadcastConversationUpdated = (conversationId: string, conversation: any) => {
  const io = globalForSocket.socketio
  if (io) {
    io.emit('conversation-updated', {
      conversationId,
      conversation
    })
    console.log(`Broadcasted conversation updated: ${conversationId}`)
  } else {
    console.log('WebSocket server not initialized, conversation update not broadcasted')
  }
}

export const broadcastConversationDeleted = (conversationId: string) => {
  const io = globalForSocket.socketio
  if (io) {
    io.emit('conversation-deleted', {
      conversationId
    })
    console.log(`Broadcasted conversation deleted: ${conversationId}`)
  } else {
    console.log('WebSocket server not initialized, conversation deletion not broadcasted')
  }
}

export const broadcastInstanceStatusChanged = (instanceName: string, status: string, phoneNumber?: string) => {
  const io = globalForSocket.socketio
  if (io) {
    io.emit('instance-status-changed', {
      instanceName,
      status,
      phoneNumber
    })
    console.log(`Broadcasted instance status changed: ${instanceName} - ${status}`)
  } else {
    console.log('WebSocket server not initialized, instance status change not broadcasted')
  }
}

// Broadcast notification to all agents or specific user
export const broadcastNotification = (notification: NotificationEvent) => {
  const io = globalForSocket.socketio
  if (io) {
    if (notification.userId) {
      // Send to specific user room
      io.to(`user:${notification.userId}`).emit('notification', notification)
      console.log(`Broadcasted notification to user:${notification.userId}`)
    } else {
      // Send to all agents
      io.to('queue:agents').emit('notification', notification)
      console.log('Broadcasted notification to all agents')
    }
  } else {
    console.log('WebSocket server not initialized, notification not broadcasted')
  }
}

// Broadcast queue updates to agents
export const broadcastQueueUpdate = (event: QueueUpdatedEvent) => {
  const io = globalForSocket.socketio
  if (io) {
    io.to('queue:agents').emit('queue-updated', event)
    console.log(`Broadcasted queue update: ${event.action} for conversation ${event.conversationId}`)
  } else {
    console.log('WebSocket server not initialized, queue update not broadcasted')
  }
}

// Broadcast agent status changes
export const broadcastAgentStatusChanged = (event: AgentStatusChangedEvent) => {
  const io = globalForSocket.socketio
  if (io) {
    io.emit('agent-status-changed', event)
    console.log(`Broadcasted agent status changed: ${event.agentId} - ${event.status}`)
  } else {
    console.log('WebSocket server not initialized, agent status change not broadcasted')
  }
}