import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Task } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

// Component to center the map on user location
function MapCenterer({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
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

export function NearbyMap({ tasks, userLocation, onTaskClick }: NearbyMapProps) {
  const { t } = useLanguage();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]); // Default: Brasília
  const [tasksWithCoords, setTasksWithCoords] = useState<TaskWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create custom icon for tasks
  const taskIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }), []);
  
  // Geocode user location
  useEffect(() => {
    const geocodeUserLocation = async () => {
      if (userLocation) {
        const coords = await geocodeLocation(userLocation);
        if (coords) {
          setMapCenter([coords.lat, coords.lng]);
        }
      }
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
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-border relative">
      {loading && (
        <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Carregando mapa...</span>
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterer center={mapCenter} />
        
        {tasksWithCoords.map(({ task, coords }) => (
          <Marker
            key={task.id}
            position={[coords.lat, coords.lng]}
            icon={taskIcon}
            eventHandlers={{
              click: () => onTaskClick(task),
            }}
          >
            <Popup>
              <div className="p-1">
                <h4 className="font-semibold text-sm mb-1">{task.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{task.location}</p>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => onTaskClick(task)}
                >
                  {t('tagDetails')}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
