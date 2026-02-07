import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { useGoogleMaps } from '@/components/maps/GoogleMapsProvider';
import { GraduationCap, Loader2, MapPin, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * University/College search autocomplete component
 * Uses Google Maps JavaScript SDK (Places library) for client-side search.
 * Works in both local dev and production (no server proxy needed).
 */
export default function UniversitySearch({ onSelect, placeholder = "Search for a university..." }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [sdkReady, setSdkReady] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const { isLoaded: mapsLoaded } = useGoogleMaps();

  // Initialize services when Google Maps is loaded
  useEffect(() => {
    if (!mapsLoaded) {
      console.log('🎓 [UNIV SEARCH] Waiting for Google Maps to load...');
      return;
    }

    if (!window.google?.maps?.places) {
      console.error('🎓 [UNIV SEARCH] Google Maps Places library not available');
      return;
    }

    console.log('🎓 [UNIV SEARCH] Initializing Places services...');
    
    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      
      // PlacesService needs a DOM element
      const div = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(div);
      
      // Create a session token for grouping autocomplete + details calls
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      
      setSdkReady(true);
      console.log('🎓 [UNIV SEARCH] Services initialized successfully');
    } catch (err) {
      console.error('🎓 [UNIV SEARCH] Error initializing services:', err);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position when showing
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showDropdown, results]);

  const performSearch = useCallback(async (searchQuery) => {
    if (!autocompleteServiceRef.current) {
      console.warn('🎓 [UNIV SEARCH] AutocompleteService not ready');
      return;
    }

    setLoading(true);

    // Append "university" if user hasn't typed it
    let enhancedQuery = searchQuery;
    if (!searchQuery.toLowerCase().includes('university') && !searchQuery.toLowerCase().includes('college')) {
      enhancedQuery = `${searchQuery} university`;
    }

    console.log('🎓 [UNIV SEARCH] Searching for:', enhancedQuery);

    const request = {
      input: enhancedQuery,
      types: ['establishment'],
      sessionToken: sessionTokenRef.current,
    };

    autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
      console.log('🎓 [UNIV SEARCH] Autocomplete status:', status, 'results:', predictions?.length || 0);
      
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        // Filter to likely universities/colleges by checking the description
        const filtered = predictions.filter(p => {
          const desc = (p.description || '').toLowerCase();
          const types = p.types || [];
          return types.includes('university') || 
                 types.includes('school') || 
                 desc.includes('university') || 
                 desc.includes('college') ||
                 desc.includes('institute');
        });

        const mapped = (filtered.length > 0 ? filtered : predictions).slice(0, 8).map(p => ({
          place_id: p.place_id,
          google_place_id: p.place_id,
          name: p.structured_formatting?.main_text || p.description,
          address: p.structured_formatting?.secondary_text || p.description,
          description: p.description,
        }));

        console.log('🎓 [UNIV SEARCH] Mapped results:', mapped.map(r => r.name));
        setResults(mapped);
        setShowDropdown(true);
      } else {
        console.warn('🎓 [UNIV SEARCH] No results. Status:', status);
        setResults([]);
        setShowDropdown(true); // Show "no results" message
      }
      setLoading(false);
    });
  }, []);

  const handleSelect = useCallback((university) => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);

    // Fetch full details (lat/lng, photos) for the selected place
    if (!placesServiceRef.current || !university.place_id) {
      console.warn('🎓 [UNIV SEARCH] No PlacesService or place_id, returning prediction data');
      onSelect(university);
      return;
    }

    console.log('🎓 [UNIV SEARCH] Fetching details for:', university.name, university.place_id);

    const request = {
      placeId: university.place_id,
      fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos'],
      sessionToken: sessionTokenRef.current,
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      console.log('🎓 [UNIV SEARCH] Details status:', status);
      
      // Refresh session token after details call
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 800 }) || '';
        
        const result = {
          google_place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          latitude: place.geometry?.location?.lat(),
          longitude: place.geometry?.location?.lng(),
          photo_url: photoUrl,
        };
        console.log('🎓 [UNIV SEARCH] Got full details:', result.name, result.latitude, result.longitude);
        onSelect(result);
      } else {
        console.warn('🎓 [UNIV SEARCH] Details failed, using prediction data');
        onSelect(university);
      }
    });
  }, [onSelect]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.length >= 2) {
      setShowDropdown(true);
    }
  };

  // Dropdown content
  const DropdownContent = () => {
    if (!showDropdown) return null;

    const content = (
      <div 
        className="fixed bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          zIndex: 9999
        }}
      >
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
            <p className="text-sm">Searching universities...</p>
          </div>
        ) : results.length > 0 ? (
          results.map((university) => (
            <button
              key={university.place_id}
              onClick={() => handleSelect(university)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{university.name}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {university.address || 'Address not available'}
                </p>
              </div>
            </button>
          ))
        ) : query.length >= 2 ? (
          <div className="p-4 text-center text-gray-500">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No universities found for "{query}"</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        ) : null}
      </div>
    );

    return createPortal(content, document.body);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative" ref={inputRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      <DropdownContent />

      {!mapsLoaded && (
        <p className="text-xs text-orange-500 mt-1">Loading Google Maps...</p>
      )}
      {mapsLoaded && !sdkReady && (
        <p className="text-xs text-orange-500 mt-1">Initializing search...</p>
      )}
      {query.length > 0 && query.length < 2 && (
        <p className="text-xs text-gray-400 mt-1">Type at least 2 characters to search</p>
      )}
    </div>
  );
}
