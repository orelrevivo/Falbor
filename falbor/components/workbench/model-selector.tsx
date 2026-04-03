"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { ChevronDown, AlertCircle } from "lucide-react"
import { MODEL_OPTIONS } from "@/lib/common/prompts/prompt"

interface ModelSelectorProps {
  currentModel: string
  onModelChange: (model: string) => void
  disabled?: boolean
}

export function ModelSelector({ currentModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [pendingModel, setPendingModel] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom') // NEW: Dynamic position
  const buttonRef = useRef<HTMLButtonElement>(null) // NEW: Ref for positioning

  // NEW: Calculate position on open
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = 200 // Approximate height; adjust based on MODEL_OPTIONS length

    setDropdownPosition(spaceBelow >= dropdownHeight ? 'bottom' : 'top')
  }, [isOpen])

  const handleModelChange = (newModel: string) => {
    if (newModel !== currentModel) {
      setPendingModel(newModel)
      setShowWarning(true)
    } else {
      setIsOpen(false)
    }
  }

  const confirmModelChange = () => {
    if (pendingModel) {
      onModelChange(pendingModel)
      setPendingModel(null)
    }
    setShowWarning(false)
    setIsOpen(false)
  }

  const cancelModelChange = () => {
    setPendingModel(null)
    setShowWarning(false)
  }

  const selectedModel = MODEL_OPTIONS.find((m: any) => m.id === currentModel)
  const currentModelName = selectedModel?.name || "Select Model"
  const currentModelIcon = selectedModel?.iconUrl

  // NEW: Dropdown styles based on position
  const dropdownStyles = {
    position: 'fixed' as const,
    width: '16rem', // w-64
    backgroundColor: '#1E1E21',
    border: '1px solid #3A3A3E',
    borderRadius: '0.5rem', // rounded-lg
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // shadow-lg
    zIndex: 50,
  } as React.CSSProperties

  if (dropdownPosition === 'bottom') {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      dropdownStyles.top = `${rect.bottom + 8}px` // mt-2
      dropdownStyles.left = `${rect.left}px`
    }
  } else {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      dropdownStyles.bottom = `${window.innerHeight - rect.top + 8}px` // mb-2 equivalent, flipped
      dropdownStyles.left = `${rect.left}px`
    }
  }

  // Dropdown content
  const dropdownContent = isOpen && (
    <div style={dropdownStyles}>
      <div className="p-2 space-y-1">
        {MODEL_OPTIONS.map((model: any) => (
          <button
            key={model.id}
            onClick={() => handleModelChange(model.id)}
            className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
              currentModel === model.id ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" : "hover:bg-[#2A2A2E] text-white/75"
            }`}
          >
            <div className="flex items-center gap-2">
              {model.iconUrl && (
                <img src={model.iconUrl} alt="" className="w-4 h-4 object-contain opacity-80" />
              )}
              <span className="text-sm">{model.name}</span>
            </div>
            {model.isPremium && (
              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Pro
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // Warning modal (fixed, no change)
  const warningContent = showWarning && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1E1E21] border border-[#3A3A3E] rounded-lg p-6 max-w-md">
        <div className="flex gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-white mb-2">Switch Model?</h3>
            <p className="text-sm text-white/75 mb-4">
              Switching to a different model will start a new chat. The current conversation history will not be
              transferred to the new model. Are you sure you want to continue?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelModelChange}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmModelChange}>
                Switch Model
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2A2A2E] border border-white/10 hover:border-white/20 transition-all text-white/90"
      >
        {currentModelIcon && <img src={currentModelIcon} alt="" className="w-4 h-4 object-contain" />}
        <span className="text-sm font-medium">{currentModelName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Portal dropdown to body for no clipping */}
      {typeof window !== 'undefined' && isOpen && createPortal(dropdownContent, document.body)}

      {/* Portal warning for consistency */}
      {typeof window !== 'undefined' && showWarning && createPortal(warningContent, document.body)}
    </div>
  )
}