import { useEffect, useState, useRef, useMemo } from 'react';
import { Task, Product } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, User } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(location)) return geocodeCache.get(location) || null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR,pt,en;q=0.9' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]) {
        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.set(location, result);
        return result;
      }
    }
  } catch (e) { console.error('Geocode error:', e); }
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
  isOwn: boolean;
}

interface CommunityMarker { id: string; name: string; location: string; memberUserIds?: string[]; }

interface NearbyMapProps {
  tasks: Task[];
  products?: Product[];
  communities?: CommunityMarker[];
  userLocation: string | null;
  userId?: string;
  collaboratingTaskIds?: Set<string>;
  onTaskClick: (task: Task) => void;
  onProductClick?: (product: Product) => void;
  onCommunityClick?: (id: string) => void;
}

const MARKER_COLORS: Record<MarkerType, string> = {
  task: '#3b82f6',
  product: '#f59e0b',
  community: '#8b5cf6',
};

const MARKER_EMOJIS: Record<MarkerType, string> = {
  task: '📋',
  product: '📦',
  community: '👥',
};

const MARKER_ZINDEX: Record<MarkerType, number> = {
  community: 100,
  product: 200,
  task: 300,
};

function createIcon(L: any, type: MarkerType) {
  const color = MARKER_COLORS[type];
  return L.divIcon({
    className: 'nearby-marker',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:40px;height:40px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 12px rgba(0,0,0,0.35);
      font-size:18px;cursor:pointer;
      transition:transform 0.15s ease;
      position:relative;z-index:${MARKER_ZINDEX[type]};
    ">${MARKER_EMOJIS[type]}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36],
    tooltipAnchor: [0, -36],
  });
}

function applySmartOffset(items: MarkerItem[]): MarkerItem[] {
  const grouped = new Map<string, MarkerItem[]>();
  for (const item of items) {
    const key = `${item.coords.lat.toFixed(3)},${item.coords.lng.toFixed(3)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const result: MarkerItem[] = [];
  for (const [, group] of grouped) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      const baseRadius = 0.003;
      const offsetRadius = baseRadius + (group.length > 4 ? 0.002 : 0);
      group.forEach((item, i) => {
        const angle = (2 * Math.PI * i) / group.length + (Math.PI / 6);
        result.push({
          ...item,
          coords: {
            lat: item.coords.lat + offsetRadius * Math.cos(angle),
            lng: item.coords.lng + offsetRadius * Math.sin(angle),
          },
        });
      });
    }
  }
  return result;
}

export function NearbyMap({ tasks, products = [], communities = [], userLocation, userId, collaboratingTaskIds, onTaskClick, onProductClick, onCommunityClick }: NearbyMapProps) {
  const { language } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapCenter] = useState<[number, number]>([-15.78, -47.93]);
  const [allMarkers, setAllMarkers] = useState<MarkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  // Filter states
  const [activeFilter, setActiveFilter] = useState<MarkerType | null>(null);
  const [showMyActivities, setShowMyActivities] = useState(true);

  // Handle filter button clicks - toggle between showing only that type or showing all
  const toggleFilter = (type: MarkerType) => {
    if (activeFilter === type) {
      setActiveFilter(null); // Click same button = show all
    } else {
      setActiveFilter(type); // Click different button = show only that type
    }
  };

  // Determine which items are "own"
  const isOwnTask = (t: Task) => {
    if (!userId) return false;
    return t.created_by === userId || (collaboratingTaskIds?.has(t.id) ?? false);
  };
  const isOwnProduct = (p: Product) => {
    if (!userId) return false;
    return p.created_by === userId;
  };
  const isOwnCommunity = (c: CommunityMarker) => {
    if (!userId) return false;
    return c.memberUserIds?.includes(userId) ?? false;
  };

   // Filtered markers
   const markers = useMemo(() => {
     return allMarkers.filter(m => {
       if (m.type === 'task' && !showTasks) return false;
       if (m.type === 'product' && !showProducts) return false;
       if (m.type === 'community' && !showCommunities) return false;
       if (!showMyActivities && (m.isOwn || m.type === 'community')) return false;
       return true;
     });
   }, [allMarkers, showTasks, showProducts, showCommunities, showMyActivities]);

  useEffect(() => {
    let m = true;
    import('leaflet').then(l => { if (m) setL(l.default); });
    return () => { m = false; };
  }, []);

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

  useEffect(() => {
    if (!userLocation) return;
    geocodeLocation(userLocation).then(coords => {
      if (coords) mapInstanceRef.current?.setView([coords.lat, coords.lng], 12);
    });
  }, [userLocation]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const items: MarkerItem[] = [];
      const allItems = [
        ...tasks.filter(t => t.location).map(t => ({ id: t.id, title: t.title, location: t.location!, type: 'task' as MarkerType, isOwn: isOwnTask(t) })),
        ...products.filter(p => p.location).map(p => ({ id: p.id, title: p.title, location: p.location!, type: 'product' as MarkerType, isOwn: isOwnProduct(p) })),
        ...communities.filter(c => c.location).map(c => ({ id: c.id, title: c.name, location: c.location, type: 'community' as MarkerType, isOwn: isOwnCommunity(c) })),
      ];
      for (const item of allItems) {
        if (cancelled) return;
        const coords = await geocodeLocation(item.location);
        if (coords) items.push({ ...item, coords });
        await new Promise(r => setTimeout(r, 80));
      }
      if (!cancelled) { setAllMarkers(applySmartOffset(items)); setLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [tasks, products, communities]);

  useEffect(() => {
    if (!L || !mapInstanceRef.current || !mapReady || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map(m => [m.coords.lat, m.coords.lng]));
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [L, markers, mapReady]);

  useEffect(() => {
    if (!L || !mapInstanceRef.current || !mapReady) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const typeLabels: Record<MarkerType, string> = {
      task: language === 'pt' ? 'Tarefa' : 'Task',
      product: language === 'pt' ? 'Produto' : 'Product',
      community: language === 'pt' ? 'Comunidade' : 'Community',
    };

    markers.forEach(item => {
      const icon = createIcon(L, item.type);
      const label = typeLabels[item.type];
      const color = MARKER_COLORS[item.type];

      const marker = L.marker([item.coords.lat, item.coords.lng], {
        icon,
        zIndexOffset: MARKER_ZINDEX[item.type],
      }).addTo(mapInstanceRef.current);

      marker.bindTooltip(
        `<div style="font-size:12px;font-weight:600;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</div>
         <div style="font-size:10px;color:${color};font-weight:500;">${label}</div>`,
        { direction: 'top', offset: [0, -4], className: 'nearby-tooltip', opacity: 0.95 }
      );

      marker.bindPopup(`
        <div style="padding:6px 2px;min-width:160px;max-width:220px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;padding:2px 8px;border-radius:9999px;background:${color}18;color:${color};font-weight:600;">${MARKER_EMOJIS[item.type]} ${label}</span>
          </div>
          <h4 style="font-weight:600;font-size:13px;margin:0 0 4px;line-height:1.3;">${item.title}</h4>
          <p style="font-size:11px;color:#777;margin:0;">📍 ${item.location}</p>
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

  const taskCount = allMarkers.filter(m => m.type === 'task').length;
  const productCount = allMarkers.filter(m => m.type === 'product').length;
  const communityCount = allMarkers.filter(m => m.type === 'community').length;

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

      {/* Filter legend + My Activities toggle */}
      <div className="flex flex-col gap-2 px-3 py-3 bg-muted/50 border-t border-border">
        <div className="flex flex-wrap items-center gap-2">
          {taskCount > 0 && (
            <button
              onClick={() => setShowTasks(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all ${
                showTasks
                  ? 'border-blue-400/50 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/50'
                  : 'border-border bg-muted/30 text-muted-foreground line-through opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: showTasks ? MARKER_COLORS.task : '#9ca3af' }} />
              {language === 'pt' ? 'Tarefas' : 'Tasks'} ({taskCount})
            </button>
          )}
          {productCount > 0 && (
            <button
              onClick={() => setShowProducts(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all ${
                showProducts
                  ? 'border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50'
                  : 'border-border bg-muted/30 text-muted-foreground line-through opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: showProducts ? MARKER_COLORS.product : '#9ca3af' }} />
              {language === 'pt' ? 'Produtos' : 'Products'} ({productCount})
            </button>
          )}
          {communityCount > 0 && (
            <button
              onClick={() => setShowCommunities(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all ${
                showCommunities
                  ? 'border-purple-400/50 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700/50'
                  : 'border-border bg-muted/30 text-muted-foreground line-through opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: showCommunities ? MARKER_COLORS.community : '#9ca3af' }} />
              {language === 'pt' ? 'Comunidades' : 'Communities'} ({communityCount})
            </button>
          )}
        </div>
        <button
          onClick={() => setShowMyActivities(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all w-fit ${
            showMyActivities
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-muted/30 text-muted-foreground opacity-60'
          }`}
        >
          <User className="w-3 h-3" />
          {language === 'pt' ? 'Minhas Atividades' : 'My Activities'}
        </button>
      </div>

      {!loading && markers.length === 0 && (
        <div className="flex items-center justify-center px-3 py-3 text-xs text-muted-foreground">
          {language === 'pt' ? 'Nenhum item com localização encontrado perto de você' : 'No items with location found near you'}
        </div>
      )}
      <style>{`
        .nearby-marker { background: none !important; border: none !important; }
        .nearby-marker > div:hover { transform: scale(1.15); }
        .nearby-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
        }
        .nearby-tooltip::before { border-top-color: #e2e8f0 !important; }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
        }
        .leaflet-popup-tip { box-shadow: none !important; }
      `}</style>
    </div>
  );
}
