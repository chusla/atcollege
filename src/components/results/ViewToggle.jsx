import React from 'react';
import { LayoutGrid, List, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ViewToggle({ view, onViewChange }) {
  const views = [
    { value: 'grid', icon: LayoutGrid, label: 'Grid' },
    { value: 'list', icon: List, label: 'List' },
    { value: 'map', icon: Map, label: 'Map' }
  ];

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      {views.map((v) => (
        <Button
          key={v.value}
          variant={view === v.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange(v.value)}
          className={`px-3 ${view === v.value ? '' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <v.icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );
}

