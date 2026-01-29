import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Task } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TaskWithCoords {
  task: Task;
  coords: { lat: number; lng: number };
}

interface MapContentProps {
  center: [number, number];
  tasksWithCoords: TaskWithCoords[];
  onTaskClick: (task: Task) => void;
}

// Component to center the map on user location
function MapCenterer({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  
  return null;
}

export default function NearbyMapContent({ center, tasksWithCoords, onTaskClick }: MapContentProps) {
  const { t } = useLanguage();
  
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
  
  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterer center={center} />
      
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
  );
}
