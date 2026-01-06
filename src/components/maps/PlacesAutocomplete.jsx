import React, { useRef, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2 } from 'lucide-react'

export default function PlacesAutocomplete({
  value = '',
  onChange,
  onPlaceSelect,
  placeholder = 'Search for a location...',
  className = '',
  bias = null, // { lat, lng } to bias results toward
  disabled = false
}) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if Google Maps is loaded
    if (!window.google?.maps?.places) {
      console.warn('Google Places API not loaded')
      return
    }

    setIsLoaded(true)

    // Initialize autocomplete
    const options = {
      types: ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'geometry', 'place_id']
    }

    // Add location bias if provided
    if (bias?.lat && bias?.lng) {
      options.locationBias = {
        center: { lat: bias.lat, lng: bias.lng },
        radius: 50000 // 50km radius
      }
    }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      options
    )

    // Handle place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      
      if (place.geometry) {
        const placeData = {
          name: place.name,
          address: place.formatted_address,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          placeId: place.place_id
        }
        
        if (onPlaceSelect) {
          onPlaceSelect(placeData)
        }
        
        if (onChange) {
          onChange(place.formatted_address || place.name)
        }
      }
    })

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [bias, onPlaceSelect, onChange])

  // Handle manual input change
  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  if (!isLoaded && !window.google?.maps?.places) {
    return (
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
          disabled={disabled}
        />
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    </div>
  )
}

