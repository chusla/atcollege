import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { searchUniversities } from '@/api/googlePlaces';
import { GraduationCap, Loader2, MapPin, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * University/College search autocomplete component
 * Uses Google Places API filtered for universities
 */
export default function UniversitySearch({ onSelect, placeholder = "Search for a university..." }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

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

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const data = await searchUniversities(searchQuery);
      setResults(data);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching universities:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (university) => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    onSelect(university);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.length >= 2) {
      setShowDropdown(true);
    }
  };

  // Dropdown content component
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
        {results.length > 0 ? (
          results.map((university) => (
            <button
              key={university.google_place_id}
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
        ) : !loading && query.length >= 2 ? (
          <div className="p-4 text-center text-gray-500">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No universities found for "{query}"</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        ) : null}
      </div>
    );

    // Render dropdown in a portal so it's not clipped by dialog overflow
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

      {/* Dropdown rendered via portal */}
      <DropdownContent />

      {/* Hint */}
      {query.length > 0 && query.length < 2 && (
        <p className="text-xs text-gray-400 mt-1">Type at least 2 characters to search</p>
      )}
    </div>
  );
}
