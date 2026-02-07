import React, { createContext, useContext } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const libraries = ['places']

const GoogleMapsContext = createContext({ isLoaded: false, loadError: null })

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}

export default function GoogleMapsProvider({ children }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries,
    preventGoogleFontsLoading: false,
  })

  if (!apiKey) {
    console.warn('Google Maps API key not found. Map features will be disabled.')
  }

  if (loadError) {
    console.error('Google Maps failed to load:', loadError)
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded: apiKey ? isLoaded : false, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

