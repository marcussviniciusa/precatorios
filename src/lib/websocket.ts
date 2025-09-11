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
      lastMessageTime: message.timestamp
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