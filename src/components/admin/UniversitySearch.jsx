import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/components/maps/GoogleMapsProvider';
import { GraduationCap, Loader2, MapPin, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * University/College search component
 * Uses Google Maps JavaScript SDK (Places library) for client-side search.
 */
export default function UniversitySearch({ onSelect, placeholder = "Search for a university..." }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const { isLoaded: mapsLoaded } = useGoogleMaps();

  // Initialize services
  useEffect(() => {
    if (!mapsLoaded || !window.google?.maps?.places) return;
    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      const div = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(div);
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      setSdkReady(true);
    } catch (err) {
      console.error('🎓 [UNIV SEARCH] Init error:', err);
    }
  }, [mapsLoaded]);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2 && sdkReady) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, sdkReady]);

  const performSearch = useCallback((searchQuery) => {
    if (!autocompleteServiceRef.current) return;
    setLoading(true);

    let enhancedQuery = searchQuery;
    if (!searchQuery.toLowerCase().includes('university') && !searchQuery.toLowerCase().includes('college')) {
      enhancedQuery = `${searchQuery} university`;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: enhancedQuery,
        types: ['establishment'],
        sessionToken: sessionTokenRef.current,
      },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const filtered = predictions.filter(p => {
            const desc = (p.description || '').toLowerCase();
            const types = p.types || [];
            return types.includes('university') || types.includes('school') ||
                   desc.includes('university') || desc.includes('college') || desc.includes('institute');
          });
          setResults((filtered.length > 0 ? filtered : predictions).slice(0, 8).map(p => ({
            place_id: p.place_id,
            name: p.structured_formatting?.main_text || p.description,
            address: p.structured_formatting?.secondary_text || p.description,
          })));
        } else {
          setResults([]);
        }
        setLoading(false);
      }
    );
  }, []);

  const handleSelect = useCallback((university) => {
    console.log('🎓 Selected:', university.name);
    setSelecting(true);
    setQuery('');
    setResults([]);

    if (!placesServiceRef.current || !university.place_id) {
      onSelect(university);
      setSelecting(false);
      return;
    }

    placesServiceRef.current.getDetails(
      {
        placeId: university.place_id,
        fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos'],
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onSelect({
            google_place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            latitude: place.geometry?.location?.lat(),
            longitude: place.geometry?.location?.lng(),
            photo_url: place.photos?.[0]?.getUrl({ maxWidth: 800 }) || '',
          });
        } else {
          onSelect({ google_place_id: university.place_id, name: university.name, address: university.address });
        }
        setSelecting(false);
      }
    );
  }, [onSelect]);

  return (
    <div>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {(loading || selecting) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results list - rendered inline, no absolute/portal */}
      {results.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto bg-white">
          {results.map((university) => (
            <button
              key={university.place_id}
              type="button"
              onClick={() => handleSelect(university)}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{university.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {university.address || 'Address not available'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && results.length === 0 && query.length >= 2 && (
        <div className="mt-2 p-3 text-center text-gray-500 border border-gray-200 rounded-lg">
          <Loader2 className="w-5 h-5 mx-auto mb-1 animate-spin text-blue-500" />
          <p className="text-xs">Searching universities...</p>
        </div>
      )}

      {!loading && results.length === 0 && query.length >= 2 && debouncedQuery.length >= 2 && (
        <div className="mt-2 p-3 text-center text-gray-500 border border-gray-200 rounded-lg">
          <GraduationCap className="w-6 h-6 mx-auto mb-1 text-gray-300" />
          <p className="text-xs">No universities found for "{query}"</p>
        </div>
      )}

      {!mapsLoaded && <p className="text-xs text-orange-500 mt-1">Loading Google Maps...</p>}
      {query.length > 0 && query.length < 2 && <p className="text-xs text-gray-400 mt-1">Type at least 2 characters</p>}
    </div>
  );
}
