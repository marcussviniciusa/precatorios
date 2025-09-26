import { useState, useCallback, useEffect } from 'react'

export interface ConversationListItem {
  _id: string
  leadName: string
  leadPhone: string
  status: 'active' | 'paused' | 'completed' | 'transferred'
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  classification: 'hot' | 'warm' | 'cold' | 'discard'
  assignedAgent?: string
  sequentialNumber?: number
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  startNumber: number
  endNumber: number
  showingAll: boolean
  hasMore: boolean
}

interface UsePaginatedConversationsReturn {
  conversations: ConversationListItem[]
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  totalCount: number
  itemsPerPage: number
  pageInfo: { startNumber: number; endNumber: number }
  showingAll: boolean
  fetchPage: (page: number) => Promise<void>
  setItemsPerPage: (itemsPerPage: number) => void
  refresh: () => Promise<void>
}

const ITEMS_PER_PAGE_KEY = 'conversationsPerPage'

export const usePaginatedConversations = (initialItemsPerPage = 25): UsePaginatedConversationsReturn => {
  // Carregar preferência salva do localStorage
  const loadSavedItemsPerPage = () => {
    if (typeof window === 'undefined') return initialItemsPerPage
    const saved = localStorage.getItem(ITEMS_PER_PAGE_KEY)
    return saved ? parseInt(saved, 10) : initialItemsPerPage
  }

  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPageState] = useState(() => loadSavedItemsPerPage())
  const [pageInfo, setPageInfo] = useState({ startNumber: 1, endNumber: 25 })
  const [showingAll, setShowingAll] = useState(false)

  // Cache para páginas já carregadas
  const [cache] = useState(new Map<string, { conversations: ConversationListItem[], paginationInfo: PaginationInfo }>())

  const getCacheKey = (page: number, limit: number) => `${page}-${limit}`

  const fetchPage = useCallback(async (page: number, limit: number = itemsPerPage) => {
    const cacheKey = getCacheKey(page, limit)

    // Verificar cache primeiro
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!
      setConversations(cached.conversations)
      setCurrentPage(page)
      setTotalPages(cached.paginationInfo.totalPages)
      setTotalCount(cached.paginationInfo.totalCount)
      setPageInfo({
        startNumber: cached.paginationInfo.startNumber,
        endNumber: cached.paginationInfo.endNumber
      })
      setShowingAll(cached.paginationInfo.showingAll)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/conversations?page=${page}&limit=${limit}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar conversas')
      }

      const data = await response.json()

      // Salvar no cache
      cache.set(cacheKey, {
        conversations: data.conversations || [],
        paginationInfo: {
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          totalCount: data.totalCount,
          startNumber: data.startNumber,
          endNumber: data.endNumber,
          showingAll: data.showingAll,
          hasMore: data.hasMore
        }
      })

      setConversations(data.conversations || [])
      setCurrentPage(data.currentPage)
      setTotalPages(data.totalPages)
      setTotalCount(data.totalCount)
      setPageInfo({
        startNumber: data.startNumber,
        endNumber: data.endNumber
      })
      setShowingAll(data.showingAll)

    } catch (err) {
      console.error('Erro ao buscar conversas:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage, cache])

  const setItemsPerPage = useCallback((newItemsPerPage: number) => {
    // Salvar preferência no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(ITEMS_PER_PAGE_KEY, newItemsPerPage.toString())
    }

    setItemsPerPageState(newItemsPerPage)
    setCurrentPage(1)

    // Buscar primeira página com novo tamanho
    fetchPage(1, newItemsPerPage)
  }, [fetchPage])

  const refresh = useCallback(async () => {
    // Limpar cache
    cache.clear()

    // Recarregar página atual
    await fetchPage(currentPage, itemsPerPage)
  }, [currentPage, itemsPerPage, fetchPage, cache])

  // Carregar primeira página ao montar
  useEffect(() => {
    fetchPage(1, itemsPerPage)
  }, []) // Remover dependências para evitar loop

  // Método para invalidar cache (útil para WebSocket updates)
  const invalidateCache = useCallback((pageNumber?: number) => {
    if (pageNumber) {
      // Invalidar página específica
      const cacheKey = getCacheKey(pageNumber, itemsPerPage)
      cache.delete(cacheKey)
    } else {
      // Limpar todo o cache
      cache.clear()
    }
  }, [cache, itemsPerPage])

  return {
    conversations,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    pageInfo,
    showingAll,
    fetchPage: (page: number) => fetchPage(page, itemsPerPage),
    setItemsPerPage,
    refresh
  }
}