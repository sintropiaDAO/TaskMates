import { useEffect, useState, useRef } from 'react';
import { Task, Product } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Cache for geocoded locations
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(location)) return geocodeCache.get(location) || null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR,pt,en;q=0.9' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data?.[0]) {
        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.set(location, result);
        return result;
      }
    }
  } catch (error) {
    console.error('Error geocoding:', error);
  }
  geocodeCache.set(location, null);
  return null;
}

type MarkerType = 'task' | 'product' | 'community';

interface MarkerItem {
  id: string;
  title: string;
  location: string;
  type: MarkerType;
  coords: { lat: number; lng: number };
}

interface CommunityMarker {
  id: string;
  name: string;
  location: string;
}

interface NearbyMapProps {
  tasks: Task[];
  products?: Product[];
  communities?: CommunityMarker[];
  userLocation: string | null;
  onTaskClick: (task: Task) => void;
  onProductClick?: (product: Product) => void;
  onCommunityClick?: (id: string) => void;
}

const MARKER_COLORS: Record<MarkerType, string> = {
  task: '#3b82f6',      // blue
  product: '#f59e0b',   // amber
  community: '#8b5cf6', // violet
};

const MARKER_ICONS: Record<MarkerType, string> = {
  task: '📋',
  product: '📦',
  community: '👥',
};

function createCustomIcon(L: any, type: MarkerType) {
  const color = MARKER_COLORS[type];
  const emoji = MARKER_ICONS[type];
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      font-size:14px;line-height:1;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
}

export function NearbyMap({ tasks, products = [], communities = [], userLocation, onTaskClick, onProductClick, onCommunityClick }: NearbyMapProps) {
  const { language } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.78, -47.93]);
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  // Load Leaflet
  useEffect(() => {
    let mounted = true;
    import('leaflet').then(leaflet => { if (mounted) setL(leaflet.default); });
    return () => { mounted = false; };
  }, []);

  // Init map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView(mapCenter, 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
  }, [L]);

  // Center on user
  useEffect(() => {
    if (!userLocation) return;
    geocodeLocation(userLocation).then(coords => {
      if (coords) {
        setMapCenter([coords.lat, coords.lng]);
        mapInstanceRef.current?.setView([coords.lat, coords.lng], 12);
      }
    });
  }, [userLocation]);

  // Geocode all items
  useEffect(() => {
    let cancelled = false;
    const geocodeAll = async () => {
      setLoading(true);
      const items: MarkerItem[] = [];

      const allItems = [
        ...tasks.filter(t => t.location).map(t => ({ id: t.id, title: t.title, location: t.location!, type: 'task' as MarkerType })),
        ...products.filter(p => p.location).map(p => ({ id: p.id, title: p.title, location: p.location!, type: 'product' as MarkerType })),
        ...communities.filter(c => c.location).map(c => ({ id: c.id, title: c.name, location: c.location, type: 'community' as MarkerType })),
      ];

      for (const item of allItems) {
        if (cancelled) return;
        const coords = await geocodeLocation(item.location);
        if (coords) items.push({ ...item, coords });
        await new Promise(r => setTimeout(r, 80));
      }
      if (!cancelled) { setMarkers(items); setLoading(false); }
    };
    geocodeAll();
    return () => { cancelled = true; };
  }, [tasks, products, communities]);

  // Render markers
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !mapReady) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    markers.forEach(item => {
      const icon = createCustomIcon(L, item.type);
      const typeLabel = item.type === 'task'
        ? (language === 'pt' ? 'Tarefa' : 'Task')
        : item.type === 'product'
        ? (language === 'pt' ? 'Produto' : 'Product')
        : (language === 'pt' ? 'Comunidade' : 'Community');

      const marker = L.marker([item.coords.lat, item.coords.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="padding:4px;min-width:140px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:10px;padding:1px 6px;border-radius:9999px;background:${MARKER_COLORS[item.type]}20;color:${MARKER_COLORS[item.type]};font-weight:600;">${typeLabel}</span>
            </div>
            <h4 style="font-weight:600;font-size:13px;margin:0 0 2px;">${item.title}</h4>
            <p style="font-size:11px;color:#888;margin:0;">${item.location}</p>
          </div>
        `);

      marker.on('click', () => {
        if (item.type === 'task') {
          const task = tasks.find(t => t.id === item.id);
          if (task) onTaskClick(task);
        } else if (item.type === 'product' && onProductClick) {
          const product = products.find(p => p.id === item.id);
          if (product) onProductClick(product);
        } else if (item.type === 'community' && onCommunityClick) {
          onCommunityClick(item.id);
        }
      });

      markersRef.current.push(marker);
    });
  }, [L, markers, mapReady, language, tasks, products, onTaskClick, onProductClick, onCommunityClick]);

  const taskCount = markers.filter(m => m.type === 'task').length;
  const productCount = markers.filter(m => m.type === 'product').length;
  const communityCount = markers.filter(m => m.type === 'community').length;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border relative">
      {(loading || !mapReady) && (
        <div className="absolute inset-0 bg-background/80 z-[1000] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">
            {!mapReady ? (language === 'pt' ? 'Carregando mapa...' : 'Loading map...') : (language === 'pt' ? 'Localizando itens...' : 'Locating items...')}
          </span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-[350px]" />
      {/* Legend */}
      {!loading && markers.length > 0 && (
        <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 text-xs">
          {taskCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: MARKER_COLORS.task }} />
              {language === 'pt' ? 'Tarefas' : 'Tasks'} ({taskCount})
            </span>
          )}
          {productCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: MARKER_COLORS.product }} />
              {language === 'pt' ? 'Produtos' : 'Products'} ({productCount})
            </span>
          )}
          {communityCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: MARKER_COLORS.community }} />
              {language === 'pt' ? 'Comunidades' : 'Communities'} ({communityCount})
            </span>
          )}
        </div>
      )}
      <style>{`
        .custom-map-marker { background: none !important; border: none !important; }
      `}</style>
    </div>
  );
}
