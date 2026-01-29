import { useEffect, useState, lazy, Suspense, memo } from 'react';
import { Task } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, MapPin } from 'lucide-react';

// Cache for geocoded locations
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

// Geocode a location string using Nominatim API
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(location)) {
    return geocodeCache.get(location) || null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR,pt,en;q=0.9'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.set(location, result);
        return result;
      }
    }
  } catch (error) {
    console.error('Error geocoding location:', error);
  }

  geocodeCache.set(location, null);
  return null;
}

interface NearbyMapProps {
  tasks: Task[];
  userLocation: string | null;
  onTaskClick: (task: Task) => void;
}

interface TaskWithCoords {
  task: Task;
  coords: { lat: number; lng: number };
}

// Lazy loaded map component
const MapContent = lazy(() => import('./NearbyMapContent'));

export function NearbyMap({ tasks, userLocation, onTaskClick }: NearbyMapProps) {
  const { t } = useLanguage();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]); // Default: Brasília
  const [tasksWithCoords, setTasksWithCoords] = useState<TaskWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  
  // Geocode user location
  useEffect(() => {
    const geocodeUserLocation = async () => {
      if (userLocation) {
        const coords = await geocodeLocation(userLocation);
        if (coords) {
          setMapCenter([coords.lat, coords.lng]);
        }
      }
      setMapReady(true);
    };
    geocodeUserLocation();
  }, [userLocation]);
  
  // Geocode all task locations
  useEffect(() => {
    const geocodeTasks = async () => {
      setLoading(true);
      const tasksToGeocode = tasks.filter(task => task.location);
      
      const results: TaskWithCoords[] = [];
      
      // Process in batches to respect rate limits
      for (const task of tasksToGeocode) {
        const coords = await geocodeLocation(task.location!);
        if (coords) {
          results.push({ task, coords });
        }
        // Small delay between requests to respect Nominatim rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setTasksWithCoords(results);
      setLoading(false);
    };
    
    geocodeTasks();
  }, [tasks]);
  
  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-border relative bg-muted">
      {(loading || !mapReady) && (
        <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Carregando mapa...</span>
        </div>
      )}
      {mapReady && (
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Carregando mapa...</span>
          </div>
        }>
          <MapContent
            center={mapCenter}
            tasksWithCoords={tasksWithCoords}
            onTaskClick={onTaskClick}
          />
        </Suspense>
      )}
    </div>
  );
}
