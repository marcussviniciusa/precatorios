import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseWebSocketProps {
  onNewMessage?: (data: { conversationId: string; message: any }) => void
  onConversationUpdated?: (data: { conversationId: string; conversation?: any; lastMessage?: string; lastMessageTime?: Date }) => void
  onConversationDeleted?: (data: { conversationId: string }) => void
  onInstanceStatusChanged?: (data: { instanceName: string; status: string; phoneNumber?: string }) => void
}

export const useWebSocket = ({
  onNewMessage,
  onConversationUpdated,
  onConversationDeleted,
  onInstanceStatusChanged
}: UseWebSocketProps = {}) => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize socket connection only once
    if (socketRef.current) return

    socketRef.current = io({
      path: '/api/socketio',
    })

    const socket = socketRef.current

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to WebSocket server')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
      setIsConnected(false)
    })

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, []) // Remove dependencies to prevent reconnections

  // Separate effect for event listeners
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // Remove existing listeners
    socket.off('new-message')
    socket.off('conversation-updated')
    socket.off('conversation-deleted')
    socket.off('instance-status-changed')

    // Add new listeners
    if (onNewMessage) {
      socket.on('new-message', onNewMessage)
    }

    if (onConversationUpdated) {
      socket.on('conversation-updated', onConversationUpdated)
    }

    if (onConversationDeleted) {
      socket.on('conversation-deleted', onConversationDeleted)
    }

    if (onInstanceStatusChanged) {
      socket.on('instance-status-changed', onInstanceStatusChanged)
    }
  }, [onNewMessage, onConversationUpdated, onConversationDeleted, onInstanceStatusChanged])

  // Join a conversation room for targeted updates
  const joinConversation = (conversationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-conversation', conversationId)
    }
  }

  // Leave a conversation room
  const leaveConversation = (conversationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-conversation', conversationId)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    joinConversation,
    leaveConversation
  }
}