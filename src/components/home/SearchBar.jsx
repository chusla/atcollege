import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin } from 'lucide-react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState('5');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query, radius);
  };

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery, radius);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-center">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search events, places, opportunities..."
          className="pl-12 pr-4 py-6 text-lg rounded-full border-gray-200"
        />
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gray-500" />
        <Select value={radius} onValueChange={setRadius}>
          <SelectTrigger className="w-32 rounded-full">
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
    </form>
  );
}

