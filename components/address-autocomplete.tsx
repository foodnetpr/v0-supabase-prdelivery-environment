"use client"

/**
 * AddressAutocomplete - Custom autocomplete using Google Places API (New) via REST.
 * Uses the Places API (New) which works for all customers including new API keys.
 */

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"

export interface AddressComponents {
  streetAddress: string
  city: string
  state: string
  zip: string
}

interface Prediction {
  placeId: string
  text: string
  mainText: string
  secondaryText: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelected?: (components: AddressComponents) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  onBlur,
  placeholder = "Número de Casa o Edificio, Calle",
  className = "",
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isManualMode, setIsManualMode] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [noResultsFound, setNoResultsFound] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Sync external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch predictions from our API
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([])
      setNoResultsFound(false)
      return
    }

    setIsLoading(true)
    setNoResultsFound(false)
    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`
      )
      const data = await response.json()
      
      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions)
        setShowDropdown(true)
        setNoResultsFound(false)
      } else {
        // No results found - show helpful prompt
        setPredictions([])
        setNoResultsFound(true)
        setShowDropdown(true)
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error)
      setNoResultsFound(true)
      setShowDropdown(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
    setSelectedIndex(-1)

    if (isManualMode) return

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue)
    }, 300)
  }

  // Handle prediction selection
  const handleSelectPrediction = async (prediction: Prediction) => {
    setShowDropdown(false)
    setIsLoading(true)

    try {
      // Fetch place details
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`
      )
      const data = await response.json()

      if (data.addressComponents) {
        const streetAddress = data.streetAddress || prediction.mainText
        setInputValue(streetAddress)
        onChange(streetAddress)

        if (onAddressSelected) {
          onAddressSelected({
            streetAddress,
            city: data.city || "",
            state: data.state || "PR",
            zip: data.zip || "",
          })
        }

        // Trigger distance calculation after form state has updated
        if (onBlur) {
          setTimeout(onBlur, 300)
        }
      } else {
        // Fallback: use the prediction text
        setInputValue(prediction.mainText)
        onChange(prediction.mainText)
      }
    } catch (error) {
      console.error("Failed to fetch place details:", error)
      setInputValue(prediction.mainText)
      onChange(prediction.mainText)
    } finally {
      setIsLoading(false)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev < predictions.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectPrediction(predictions[selectedIndex])
        }
        break
      case "Escape":
        setShowDropdown(false)
        break
    }
  }

  const handleSwitchToManual = () => {
    setIsManualMode(true)
    setPredictions([])
    setShowDropdown(false)
  }

  const handleSwitchToAuto = () => {
    setIsManualMode(false)
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        required
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (predictions.length > 0 && !isManualMode) {
            setShowDropdown(true)
          }
        }}
        onBlur={(e) => {
          // Delay to allow click on dropdown
          setTimeout(() => {
            if (!dropdownRef.current?.contains(document.activeElement)) {
              setShowDropdown(false)
              if (onBlur) onBlur()
            }
          }, 150)
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {/* Predictions dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-[10001] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? "bg-gray-100" : ""
              }`}
              onClick={() => handleSelectPrediction(prediction)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <svg
                className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div>
                <div className="font-medium text-gray-900">
                  {prediction.mainText}
                </div>
                <div className="text-sm text-gray-500">
                  {prediction.secondaryText}
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50">
            powered by Google
          </div>
        </div>
      )}

      {/* No results found - show helpful message with guidance */}
      {showDropdown && noResultsFound && predictions.length === 0 && !isLoading && (
        <div
          ref={dropdownRef}
          className="absolute z-[10001] w-full mt-1 bg-white border border-amber-300 rounded-md shadow-lg overflow-hidden"
        >
          <div className="p-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">No encontramos esta direccion</p>
                <p className="text-xs text-amber-700 mt-1">
                  Algunas direcciones en Puerto Rico no aparecen en Google. Puedes ingresarla manualmente.
                </p>
              </div>
            </div>
          </div>
          
          {/* Guidance for what to include */}
          <div className="p-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs font-medium text-blue-800 mb-1.5">Al ingresar manualmente, incluye:</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-blue-700">
              <div className="flex items-center gap-1">
                <span className="text-blue-400">•</span> Numero de casa/edificio
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-400">•</span> Nombre de calle
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-400">•</span> Urbanizacion/residencial
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-400">•</span> Apt/oficina/suite
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => {
              handleSwitchToManual()
              setShowDropdown(false)
              setNoResultsFound(false)
            }}
            className="w-full px-4 py-3 text-left bg-white hover:bg-amber-50 flex items-center gap-3 transition-colors"
          >
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div>
              <div className="font-medium text-amber-700">Ingresar direccion manualmente</div>
              <div className="text-xs text-gray-500">Continua escribiendo tu direccion completa</div>
            </div>
          </button>
        </div>
      )}

      {/* Manual mode indicator, toggle, and guidance */}
      {isManualMode ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modo manual
            </span>
            <button
              type="button"
              onClick={handleSwitchToAuto}
              className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
            >
              Activar autocompletado
            </button>
          </div>
          
          {/* Manual mode guidance panel */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-blue-800 mb-1">Para asegurar la entrega, incluye:</p>
                <ul className="text-[11px] text-blue-700 space-y-0.5">
                  <li className="flex items-start gap-1">
                    <span className="text-blue-400">•</span>
                    <span>Numero de casa o edificio</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-blue-400">•</span>
                    <span>Nombre de calle o numero</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-blue-400">•</span>
                    <span>Urbanizacion, residencial o condominio</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-blue-400">•</span>
                    <span>Apartamento, oficina o suite (si aplica)</span>
                  </li>
                </ul>
                <p className="text-[10px] text-blue-600 mt-1.5 italic">
                  Usa el campo "Apt, Urb, Suite" para detalles adicionales como codigos de acceso o instrucciones especiales.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSwitchToManual}
          className="text-xs text-gray-400 hover:text-gray-600 mt-1 underline transition-colors"
        >
          Ingresar manualmente
        </button>
      )}
    </div>
  )
}
