import { useEffect, useState, useRef, useCallback } from 'react';
import { Task } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

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

export function NearbyMap({ tasks, userLocation, onTaskClick }: NearbyMapProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]);
  const [tasksWithCoords, setTasksWithCoords] = useState<TaskWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    let mounted = true;

    const loadLeaflet = async () => {
      try {
        const leaflet = await import('leaflet');
        if (mounted) {
          setL(leaflet.default);
        }
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    loadLeaflet();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    // Fix default marker icons
    const defaultIcon = L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.Marker.prototype.options.icon = defaultIcon;

    // Create map
    const map = L.map(mapRef.current).setView(mapCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [L]);

  // Update map center
  useEffect(() => {
    if (mapInstanceRef.current && mapReady) {
      mapInstanceRef.current.setView(mapCenter, 12);
    }
  }, [mapCenter, mapReady]);

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

      for (const task of tasksToGeocode) {
        const coords = await geocodeLocation(task.location!);
        if (coords) {
          results.push({ task, coords });
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setTasksWithCoords(results);
      setLoading(false);
    };

    geocodeTasks();
  }, [tasks]);

  // Update markers
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    tasksWithCoords.forEach(({ task, coords }) => {
      const marker = L.marker([coords.lat, coords.lng])
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="padding: 4px;">
            <h4 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${task.title}</h4>
            <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${task.location}</p>
          </div>
        `);

      marker.on('click', () => {
        onTaskClick(task);
      });

      markersRef.current.push(marker);
    });
  }, [L, tasksWithCoords, mapReady, onTaskClick, t]);

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-border relative">
      {(loading || !mapReady) && (
        <div className="absolute inset-0 bg-background/80 z-[1000] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">
            {!mapReady ? 'Carregando mapa...' : 'Geocodificando tarefas...'}
          </span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
