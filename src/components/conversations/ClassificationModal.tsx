'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loader2, X } from 'lucide-react'
import { getAuthHeaders } from '@/lib/client-auth'

interface ClassificationModalProps {
  isOpen: boolean
  onClose: () => void
  currentClassification: 'hot' | 'warm' | 'cold' | 'discard'
  leadName: string
  leadId: string
  onClassificationUpdate: (newClassification: string) => void
}

interface ClassificationOption {
  value: 'hot' | 'warm' | 'cold' | 'discard'
  label: string
  description: string
  bgColor: string
  hoverColor: string
  selectedColor: string
  textColor: string
}

export function ClassificationModal({
  isOpen,
  onClose,
  currentClassification,
  leadName,
  leadId,
  onClassificationUpdate
}: ClassificationModalProps) {
  const [selectedClassification, setSelectedClassification] = useState<string>(currentClassification)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const classifications: ClassificationOption[] = [
    {
      value: 'hot',
      label: 'Quente',
      description: 'Lead prioritário com alta probabilidade de conversão',
      bgColor: 'bg-red-50 border-red-200',
      hoverColor: 'hover:bg-red-100',
      selectedColor: 'bg-red-500 text-white border-red-500',
      textColor: 'text-red-900'
    },
    {
      value: 'warm',
      label: 'Morno',
      description: 'Lead com potencial interessante para acompanhamento',
      bgColor: 'bg-yellow-50 border-yellow-200',
      hoverColor: 'hover:bg-yellow-100',
      selectedColor: 'bg-yellow-500 text-white border-yellow-500',
      textColor: 'text-yellow-900'
    },
    {
      value: 'cold',
      label: 'Frio',
      description: 'Lead com baixa prioridade, necessita nutrição',
      bgColor: 'bg-blue-50 border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      selectedColor: 'bg-blue-500 text-white border-blue-500',
      textColor: 'text-blue-900'
    },
    {
      value: 'discard',
      label: 'Descarte',
      description: 'Lead sem interesse ou potencial identificado',
      bgColor: 'bg-gray-50 border-gray-200',
      hoverColor: 'hover:bg-gray-100',
      selectedColor: 'bg-gray-500 text-white border-gray-500',
      textColor: 'text-gray-900'
    }
  ]

  const handleConfirm = async () => {
    if (selectedClassification === currentClassification) {
      onClose()
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/leads/${leadId}/classification`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          classification: selectedClassification
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`)
      }

      // Sucesso
      onClassificationUpdate(data.lead.classification)
      onClose()

    } catch (err) {
      console.error('Erro ao atualizar classificação:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao atualizar classificação')
    } finally {
      setIsUpdating(false)
    }
  }

  const getCurrentBadge = () => {
    const current = classifications.find(c => c.value === currentClassification)
    if (!current) return null

    return (
      <Badge variant={current.value as any} className="text-sm">
        {current.label}
      </Badge>
    )
  }

  const getSelectedClassification = () => {
    return classifications.find(c => c.value === selectedClassification)
  }

  const hasChanged = selectedClassification !== currentClassification

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Classificar Lead
            </h3>
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lead Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Lead:</span> <strong>{leadName}</strong>
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Classificação atual:</span>
              {getCurrentBadge()}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Classification Options */}
          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Selecione a nova classificação:
            </p>

            {classifications.map((classification) => {
              const isSelected = selectedClassification === classification.value

              return (
                <button
                  key={classification.value}
                  onClick={() => setSelectedClassification(classification.value)}
                  disabled={isUpdating}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? classification.selectedColor
                      : `${classification.bgColor} ${classification.hoverColor} ${classification.textColor}`
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">
                      {classification.label}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className={`text-sm ${
                    isSelected ? 'text-white/90' : 'opacity-75'
                  }`}>
                    {classification.description}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Preview */}
          {hasChanged && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Alteração:</span> {getCurrentBadge()} → {' '}
                <Badge variant={getSelectedClassification()?.value as any} className="text-sm">
                  {getSelectedClassification()?.label}
                </Badge>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isUpdating || !hasChanged}
              className="flex-1"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : hasChanged ? (
                'Confirmar Alteração'
              ) : (
                'Sem Alterações'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}