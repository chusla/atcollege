import React from 'react'
import { LoadScript } from '@react-google-maps/api'

const libraries = ['places']

export default function GoogleMapsProvider({ children }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('Google Maps API key not found. Map features will be disabled.')
    return <>{children}</>
  }

  return (
    <LoadScript 
      googleMapsApiKey={apiKey} 
      libraries={libraries}
      loadingElement={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      {children}
    </LoadScript>
  )
}

