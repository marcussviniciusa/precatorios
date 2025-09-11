import { Server } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'

export type WebSocketEvent = 
  | 'new-message'
  | 'conversation-updated'
  | 'conversation-deleted'
  | 'instance-status-changed'

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

// Global instance for the socket server
let io: Server | null = null

export const getSocketServer = (): Server | null => {
  return io
}

export const initializeSocketServer = (res: NextApiResponse): Server => {
  if (!io) {
    const httpServer = (res.socket as any).server
    
    io = new Server(httpServer, {
      path: '/api/socketio',
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      transports: ['polling', 'websocket']
    })

    io.on('connection', (socket) => {
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
      
      socket.on('disconnect', () => {
        console.log('Client disconnected from WebSocket:', socket.id)
      })
    })

    console.log('Socket.IO server initialized')
  }
  
  return io
}

// Initialize the socket server for App Router compatibility
export const ensureSocketServer = () => {
  if (!io && typeof window === 'undefined') {
    // This is a workaround for App Router - we'll initialize through the API endpoint
    console.log('Socket server not initialized, will initialize on first client connection')
  }
}

// Emit events to all connected clients
export const broadcastNewMessage = (conversationId: string, message: any) => {
  ensureSocketServer()
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
      lastMessageTime: message.timestamp
    })
    
    console.log(`Broadcasted new message to conversation:${conversationId}`)
  } else {
    console.log('WebSocket server not initialized, message not broadcasted')
  }
}

export const broadcastConversationUpdated = (conversationId: string, conversation: any) => {
  ensureSocketServer()
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
  ensureSocketServer()
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
  ensureSocketServer()
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