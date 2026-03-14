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
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`
      )
      const data = await response.json()
      
      if (data.predictions) {
        setPredictions(data.predictions)
        setShowDropdown(true)
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error)
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

      {/* Toggle manual/auto mode */}
      <button
        type="button"
        onClick={isManualMode ? handleSwitchToAuto : handleSwitchToManual}
        className="text-xs text-gray-400 hover:text-gray-600 mt-1 underline transition-colors"
      >
        {isManualMode ? "Usar autocompletado" : "Ingresar manualmente"}
      </button>
    </div>
  )
}
