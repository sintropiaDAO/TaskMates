import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, MapPinned, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface LocationSuggestion {
  display_name: string;
  city: string;
  state: string;
  neighborhood?: string;
  country: string;
  lat: string;
  lon: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder,
  className,
  disabled = false
}: LocationAutocompleteProps) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const debouncedInput = useDebounce(inputValue, 300);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch suggestions from Nominatim API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8&featuretype=city,town,village,suburb,neighbourhood`,
        {
          headers: {
            'Accept-Language': 'pt-BR,pt,en;q=0.9'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const processed: LocationSuggestion[] = data
          .filter((item: any) => item.address)
          .map((item: any) => {
            const addr = item.address;
            const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
            const state = addr.state || '';
            const neighborhood = addr.suburb || addr.neighbourhood || addr.district || '';
            const country = addr.country || '';
            
            return {
              display_name: item.display_name,
              city,
              state,
              neighborhood,
              country,
              lat: item.lat,
              lon: item.lon
            };
          })
          .filter((item: LocationSuggestion) => item.city || item.neighborhood);

        setSuggestions(processed);
        setShowSuggestions(processed.length > 0);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedInput && debouncedInput !== value) {
      fetchSuggestions(debouncedInput);
    }
  }, [debouncedInput, fetchSuggestions, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setHighlightedIndex(-1);
  };

  const formatLocationDisplay = (item: LocationSuggestion): string => {
    // Format: "City, State" or "Neighborhood - City, State"
    const stateAbbr = getStateAbbreviation(item.state, item.country);
    
    if (item.neighborhood && item.city) {
      return `${item.neighborhood} - ${item.city}, ${stateAbbr}`;
    }
    return `${item.city}, ${stateAbbr}`;
  };

  const formatLocationValue = (item: LocationSuggestion): string => {
    // Official format: "City, State"
    const stateAbbr = getStateAbbreviation(item.state, item.country);
    return `${item.city}, ${stateAbbr}`;
  };

  const getStateAbbreviation = (state: string, country: string): string => {
    // Brazilian state abbreviations
    const brazilStateMap: Record<string, string> = {
      'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
      'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
      'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
      'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
      'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
      'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
      'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
    };

    // US state abbreviations
    const usStateMap: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY'
    };

    if (country === 'Brasil' || country === 'Brazil') {
      return brazilStateMap[state] || state;
    }
    if (country === 'United States' || country === 'United States of America' || country === 'USA') {
      return usStateMap[state] || state;
    }
    
    // For other countries, use first 2-3 letters or full name
    return state.length > 3 ? state.substring(0, 3).toUpperCase() : state;
  };

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    const formatted = formatLocationValue(item);
    setInputValue(formatted);
    onChange(formatted);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      return;
    }

    setGettingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding via Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        
        // Get city name (try different fields)
        const city = address.city || address.town || address.municipality || address.county;
        const state = address.state || '';
        const country = address.country || '';
        
        const stateAbbr = getStateAbbreviation(state, country);
        
        if (city && stateAbbr) {
          const formatted = `${city}, ${stateAbbr}`;
          setInputValue(formatted);
          onChange(formatted);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder || t('locationPlaceholder')}
            className="pl-10 pr-10"
            disabled={disabled}
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGetCurrentLocation}
          disabled={gettingLocation || disabled}
          title={t('useCurrentLocation')}
        >
          {gettingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPinned className="w-4 h-4" />
          )}
        </Button>
      </div>

      {loadingSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg p-3 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Buscando locais...</span>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && !loadingSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, index) => (
            <button
              key={`${item.lat}-${item.lon}-${index}`}
              type="button"
              className={cn(
                "w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2",
                index === highlightedIndex && "bg-accent"
              )}
              onClick={() => handleSelectSuggestion(item)}
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate">{formatLocationDisplay(item)}</span>
                {item.country && (
                  <span className="text-xs text-muted-foreground truncate">{item.country}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
