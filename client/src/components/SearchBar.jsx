import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Clock } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { poiAPI } from '../services/api';

const SearchBar = ({ onPOISelect, onSearchResults, className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setShowResults(false);
        if (onSearchResults) {
          onSearchResults([]);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await poiAPI.search(searchQuery);
      if (response.success) {
        setResults(response.data);
        setShowResults(true);
        if (onSearchResults) {
          onSearchResults(response.data);
        }
      } else {
        setError('Search failed');
        setResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.trim().length === 0) {
      setShowResults(false);
    }
  };

  const handlePOISelect = (poi) => {
    setQuery(poi.name);
    setShowResults(false);
    if (onPOISelect) {
      onPOISelect(poi);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setError(null);
    if (onSearchResults) {
      onSearchResults([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  // Category colors for badges
  const categoryColors = {
    library: 'bg-purple-100 text-purple-800',
    lab: 'bg-cyan-100 text-cyan-800',
    cafeteria: 'bg-orange-100 text-orange-800',
    parking: 'bg-green-100 text-green-800',
    building: 'bg-gray-100 text-gray-800',
    dormitory: 'bg-pink-100 text-pink-800',
    sports: 'bg-red-100 text-red-800',
    admin: 'bg-blue-100 text-blue-800',
    other: 'bg-slate-100 text-slate-800',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search for buildings, facilities, or services..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-10"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-auto p-0 hover:bg-transparent"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </Button>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto" ref={resultsRef}>
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-4 text-center text-gray-500">
                <Search className="h-5 w-5 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-red-500">
                {error}
              </div>
            )}

            {!isLoading && !error && results.length === 0 && query.trim().length >= 2 && (
              <div className="p-4 text-center text-gray-500">
                No results found for "{query}"
              </div>
            )}

            {!isLoading && !error && results.length > 0 && (
              <div className="divide-y divide-gray-100">
                {results.map((poi) => (
                  <div
                    key={poi._id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handlePOISelect(poi)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {poi.name}
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${categoryColors[poi.category] || categoryColors.other}`}
                          >
                            {poi.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {poi.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{poi.address}</span>
                          </span>
                          {poi.hours && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span className="truncate">{poi.hours}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !error && results.length > 0 && (
              <div className="p-3 bg-gray-50 border-t text-center">
                <span className="text-xs text-gray-500">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;

