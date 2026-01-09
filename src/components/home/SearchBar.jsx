import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Filter } from 'lucide-react';

export default function SearchBar({ onSearch, initialQuery = '', initialRadius = '5', initialCategory = 'all' }) {
  const [query, setQuery] = useState(initialQuery);
  const [radius, setRadius] = useState(initialRadius);
  const [category, setCategory] = useState(initialCategory);

  // Update local state when initial values change (e.g., from URL params)
  useEffect(() => {
    if (initialQuery !== query) setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialRadius !== radius) setRadius(initialRadius);
  }, [initialRadius]);

  useEffect(() => {
    if (initialCategory !== category) setCategory(initialCategory);
  }, [initialCategory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query, radius, category);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    // Don't trigger search on every keystroke - only on button press
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    // Don't trigger search on category change - only on button press
  };

  const handleRadiusChange = (value) => {
    setRadius(value);
    // Don't trigger search on radius change - only on button press
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Main Search Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="w-full sm:flex-1 relative min-w-[200px]">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search events, places, opportunities..."
            className="pl-12 pr-4 py-6 text-lg rounded-full border-gray-200 w-full"
          />
        </div>
        <Button
          type="submit"
          className="w-full sm:w-auto px-8 py-6 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          Search
        </Button>
      </div>

      {/* Filters Row - Always Visible */}
      <div className="grid grid-cols-1 min-[350px]:grid-cols-2 gap-3 sm:flex sm:items-center">
        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-40 rounded-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bars">Bars</SelectItem>
              <SelectItem value="restaurants">Restaurants</SelectItem>
              <SelectItem value="cafes">Cafes</SelectItem>
              <SelectItem value="gym">Gym</SelectItem>
              <SelectItem value="library">Library</SelectItem>
              <SelectItem value="study_spot">Study Spots</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Radius Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Select value={radius} onValueChange={handleRadiusChange}>
            <SelectTrigger className="w-full sm:w-36 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 mile</SelectItem>
              <SelectItem value="2">2 miles</SelectItem>
              <SelectItem value="5">5 miles</SelectItem>
              <SelectItem value="10">10 miles</SelectItem>
              <SelectItem value="all">Any distance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
}

