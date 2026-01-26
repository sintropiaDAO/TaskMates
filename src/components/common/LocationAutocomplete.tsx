import { useState, useEffect, useRef } from 'react';
import { MapPin, MapPinned, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Brazilian cities database with state abbreviations
const BRAZILIAN_CITIES = [
  // São Paulo
  { city: 'São Paulo', state: 'SP' },
  { city: 'Campinas', state: 'SP' },
  { city: 'Santos', state: 'SP' },
  { city: 'Guarulhos', state: 'SP' },
  { city: 'São Bernardo do Campo', state: 'SP' },
  { city: 'Santo André', state: 'SP' },
  { city: 'Osasco', state: 'SP' },
  { city: 'Ribeirão Preto', state: 'SP' },
  { city: 'Sorocaba', state: 'SP' },
  { city: 'São José dos Campos', state: 'SP' },
  { city: 'Piracicaba', state: 'SP' },
  { city: 'Jundiaí', state: 'SP' },
  { city: 'Bauru', state: 'SP' },
  { city: 'Marília', state: 'SP' },
  { city: 'Presidente Prudente', state: 'SP' },
  // Rio de Janeiro
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Niterói', state: 'RJ' },
  { city: 'Petrópolis', state: 'RJ' },
  { city: 'Nova Friburgo', state: 'RJ' },
  { city: 'Campos dos Goytacazes', state: 'RJ' },
  { city: 'Volta Redonda', state: 'RJ' },
  { city: 'Duque de Caxias', state: 'RJ' },
  { city: 'São Gonçalo', state: 'RJ' },
  { city: 'Nova Iguaçu', state: 'RJ' },
  { city: 'Teresópolis', state: 'RJ' },
  // Minas Gerais
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Uberlândia', state: 'MG' },
  { city: 'Contagem', state: 'MG' },
  { city: 'Juiz de Fora', state: 'MG' },
  { city: 'Betim', state: 'MG' },
  { city: 'Montes Claros', state: 'MG' },
  { city: 'Uberaba', state: 'MG' },
  { city: 'Governador Valadares', state: 'MG' },
  { city: 'Poços de Caldas', state: 'MG' },
  { city: 'Ouro Preto', state: 'MG' },
  // Bahia
  { city: 'Salvador', state: 'BA' },
  { city: 'Feira de Santana', state: 'BA' },
  { city: 'Vitória da Conquista', state: 'BA' },
  { city: 'Camaçari', state: 'BA' },
  { city: 'Itabuna', state: 'BA' },
  { city: 'Ilhéus', state: 'BA' },
  { city: 'Porto Seguro', state: 'BA' },
  // Paraná
  { city: 'Curitiba', state: 'PR' },
  { city: 'Londrina', state: 'PR' },
  { city: 'Maringá', state: 'PR' },
  { city: 'Ponta Grossa', state: 'PR' },
  { city: 'Cascavel', state: 'PR' },
  { city: 'Foz do Iguaçu', state: 'PR' },
  // Rio Grande do Sul
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Caxias do Sul', state: 'RS' },
  { city: 'Canoas', state: 'RS' },
  { city: 'Pelotas', state: 'RS' },
  { city: 'Santa Maria', state: 'RS' },
  { city: 'Gramado', state: 'RS' },
  { city: 'Novo Hamburgo', state: 'RS' },
  // Santa Catarina
  { city: 'Florianópolis', state: 'SC' },
  { city: 'Joinville', state: 'SC' },
  { city: 'Blumenau', state: 'SC' },
  { city: 'Balneário Camboriú', state: 'SC' },
  { city: 'Chapecó', state: 'SC' },
  { city: 'Itajaí', state: 'SC' },
  // Pernambuco
  { city: 'Recife', state: 'PE' },
  { city: 'Olinda', state: 'PE' },
  { city: 'Jaboatão dos Guararapes', state: 'PE' },
  { city: 'Caruaru', state: 'PE' },
  { city: 'Petrolina', state: 'PE' },
  // Ceará
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Caucaia', state: 'CE' },
  { city: 'Juazeiro do Norte', state: 'CE' },
  { city: 'Sobral', state: 'CE' },
  // Distrito Federal
  { city: 'Brasília', state: 'DF' },
  // Goiás
  { city: 'Goiânia', state: 'GO' },
  { city: 'Aparecida de Goiânia', state: 'GO' },
  { city: 'Anápolis', state: 'GO' },
  { city: 'Rio Verde', state: 'GO' },
  // Pará
  { city: 'Belém', state: 'PA' },
  { city: 'Ananindeua', state: 'PA' },
  { city: 'Santarém', state: 'PA' },
  { city: 'Marabá', state: 'PA' },
  // Amazonas
  { city: 'Manaus', state: 'AM' },
  { city: 'Parintins', state: 'AM' },
  // Maranhão
  { city: 'São Luís', state: 'MA' },
  { city: 'Imperatriz', state: 'MA' },
  // Espírito Santo
  { city: 'Vitória', state: 'ES' },
  { city: 'Vila Velha', state: 'ES' },
  { city: 'Serra', state: 'ES' },
  { city: 'Cariacica', state: 'ES' },
  // Rio Grande do Norte
  { city: 'Natal', state: 'RN' },
  { city: 'Mossoró', state: 'RN' },
  { city: 'Parnamirim', state: 'RN' },
  // Paraíba
  { city: 'João Pessoa', state: 'PB' },
  { city: 'Campina Grande', state: 'PB' },
  // Alagoas
  { city: 'Maceió', state: 'AL' },
  { city: 'Arapiraca', state: 'AL' },
  // Piauí
  { city: 'Teresina', state: 'PI' },
  { city: 'Parnaíba', state: 'PI' },
  // Sergipe
  { city: 'Aracaju', state: 'SE' },
  // Mato Grosso
  { city: 'Cuiabá', state: 'MT' },
  { city: 'Várzea Grande', state: 'MT' },
  { city: 'Rondonópolis', state: 'MT' },
  // Mato Grosso do Sul
  { city: 'Campo Grande', state: 'MS' },
  { city: 'Dourados', state: 'MS' },
  { city: 'Três Lagoas', state: 'MS' },
  // Rondônia
  { city: 'Porto Velho', state: 'RO' },
  { city: 'Ji-Paraná', state: 'RO' },
  // Tocantins
  { city: 'Palmas', state: 'TO' },
  { city: 'Araguaína', state: 'TO' },
  // Acre
  { city: 'Rio Branco', state: 'AC' },
  // Amapá
  { city: 'Macapá', state: 'AP' },
  // Roraima
  { city: 'Boa Vista', state: 'RR' },
];

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
  const [suggestions, setSuggestions] = useState<Array<{ city: string; state: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

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

    if (val.length >= 2) {
      const filtered = BRAZILIAN_CITIES.filter(item => 
        item.city.toLowerCase().includes(val.toLowerCase()) ||
        item.state.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item: { city: string; state: string }) => {
    const formatted = `${item.city}, ${item.state}`;
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

  const handleBlur = () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      if (!inputValue.match(/^.+, [A-Z]{2}$/)) {
        // If not in valid format, clear
        if (inputValue && !BRAZILIAN_CITIES.some(c => 
          `${c.city}, ${c.state}`.toLowerCase() === inputValue.toLowerCase()
        )) {
          // Keep the value but don't save invalid format
        }
      }
    }, 200);
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
        
        // Map Brazilian state names to abbreviations
        const stateMap: Record<string, string> = {
          'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
          'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
          'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
          'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
          'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
          'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
          'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
        };
        
        const stateName = address.state;
        const stateAbbr = stateMap[stateName] || stateName;
        
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
            onBlur={handleBlur}
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

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, index) => (
            <button
              key={`${item.city}-${item.state}`}
              type="button"
              className={cn(
                "w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2",
                index === highlightedIndex && "bg-accent"
              )}
              onClick={() => handleSelectSuggestion(item)}
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{item.city}, <span className="text-muted-foreground">{item.state}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
