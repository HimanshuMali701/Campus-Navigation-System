import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';

/**
 * Radius Search Component
 * Allows users to search for facilities within a specified radius
 */
export default function RadiusSearch({
  userLocation,
  onSearch,
  onClose,
  defaultRadius = 500,
  maxRadius = 2000,
}) {
  const [radius, setRadius] = useState(defaultRadius);
  const [category, setCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'library', label: 'Library' },
    { value: 'lab', label: 'Lab' },
    { value: 'canteen', label: 'Canteen' },
    { value: 'parking', label: 'Parking' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'admin', label: 'Admin' },
  ];

  const handleSearch = async () => {
    if (!userLocation) return;

    setIsSearching(true);
    try {
      await onSearch?.({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        radius,
        category: category === 'all' ? null : category,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRadiusChange = (value) => {
    setRadius(value[0]);
  };

  if (!userLocation) {
    return null;
  }

  return (
    <Card className="border-slate-200/80 shadow-sm bg-white">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base">Radius Search</CardTitle>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Radius Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Search Radius</Label>
            <Badge variant="secondary" className="ml-auto">
              {radius < 1000 ? `${radius}m` : `${(radius / 1000).toFixed(1)}km`}
            </Badge>
          </div>
          <Slider
            value={[radius]}
            onValueChange={handleRadiusChange}
            min={100}
            max={maxRadius}
            step={50}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>100m</span>
            <span>{maxRadius < 1000 ? `${maxRadius}m` : `${(maxRadius / 1000).toFixed(1)}km`}</span>
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <Label className="text-sm font-medium">Category</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {categories.map(cat => (
              <Button
                key={cat.value}
                variant={category === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat.value)}
                className="h-9"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Location Info */}
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-slate-600">
            <span className="font-medium">Search Center:</span> ({' '}
            {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)} )
          </p>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </CardContent>
    </Card>
  );
}
