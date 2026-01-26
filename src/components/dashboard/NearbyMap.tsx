import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Task } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// City coordinates database (approximate centers)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // São Paulo
  'São Paulo, SP': { lat: -23.5505, lng: -46.6333 },
  'Campinas, SP': { lat: -22.9099, lng: -47.0626 },
  'Santos, SP': { lat: -23.9608, lng: -46.3336 },
  'Guarulhos, SP': { lat: -23.4538, lng: -46.5333 },
  'São Bernardo do Campo, SP': { lat: -23.6914, lng: -46.5646 },
  'Santo André, SP': { lat: -23.6737, lng: -46.5432 },
  'Osasco, SP': { lat: -23.5324, lng: -46.7916 },
  'Ribeirão Preto, SP': { lat: -21.1775, lng: -47.8103 },
  'Sorocaba, SP': { lat: -23.5015, lng: -47.4526 },
  'São José dos Campos, SP': { lat: -23.1896, lng: -45.8841 },
  'Piracicaba, SP': { lat: -22.7255, lng: -47.6492 },
  'Jundiaí, SP': { lat: -23.1864, lng: -46.8820 },
  'Bauru, SP': { lat: -22.3246, lng: -49.0871 },
  // Rio de Janeiro
  'Rio de Janeiro, RJ': { lat: -22.9068, lng: -43.1729 },
  'Niterói, RJ': { lat: -22.8839, lng: -43.1034 },
  'Petrópolis, RJ': { lat: -22.5112, lng: -43.1778 },
  'Nova Friburgo, RJ': { lat: -22.2820, lng: -42.5310 },
  'Campos dos Goytacazes, RJ': { lat: -21.7545, lng: -41.3244 },
  'Volta Redonda, RJ': { lat: -22.5232, lng: -44.1040 },
  'Duque de Caxias, RJ': { lat: -22.7858, lng: -43.3116 },
  'São Gonçalo, RJ': { lat: -22.8268, lng: -43.0634 },
  'Nova Iguaçu, RJ': { lat: -22.7556, lng: -43.4500 },
  'Teresópolis, RJ': { lat: -22.4119, lng: -42.9654 },
  // Minas Gerais
  'Belo Horizonte, MG': { lat: -19.9167, lng: -43.9345 },
  'Uberlândia, MG': { lat: -18.9186, lng: -48.2772 },
  'Contagem, MG': { lat: -19.9319, lng: -44.0539 },
  'Juiz de Fora, MG': { lat: -21.7642, lng: -43.3496 },
  'Betim, MG': { lat: -19.9679, lng: -44.1983 },
  'Montes Claros, MG': { lat: -16.7350, lng: -43.8617 },
  'Uberaba, MG': { lat: -19.7483, lng: -47.9317 },
  'Ouro Preto, MG': { lat: -20.3856, lng: -43.5035 },
  // Bahia
  'Salvador, BA': { lat: -12.9714, lng: -38.5014 },
  'Feira de Santana, BA': { lat: -12.2670, lng: -38.9667 },
  'Vitória da Conquista, BA': { lat: -14.8619, lng: -40.8389 },
  'Porto Seguro, BA': { lat: -16.4435, lng: -39.0643 },
  // Paraná
  'Curitiba, PR': { lat: -25.4290, lng: -49.2671 },
  'Londrina, PR': { lat: -23.3045, lng: -51.1696 },
  'Maringá, PR': { lat: -23.4205, lng: -51.9333 },
  'Ponta Grossa, PR': { lat: -25.0916, lng: -50.1668 },
  'Cascavel, PR': { lat: -24.9578, lng: -53.4595 },
  'Foz do Iguaçu, PR': { lat: -25.5163, lng: -54.5854 },
  // Rio Grande do Sul
  'Porto Alegre, RS': { lat: -30.0346, lng: -51.2177 },
  'Caxias do Sul, RS': { lat: -29.1634, lng: -51.1797 },
  'Canoas, RS': { lat: -29.9178, lng: -51.1839 },
  'Pelotas, RS': { lat: -31.7654, lng: -52.3376 },
  'Santa Maria, RS': { lat: -29.6842, lng: -53.8069 },
  'Gramado, RS': { lat: -29.3749, lng: -50.8759 },
  'Novo Hamburgo, RS': { lat: -29.6947, lng: -51.1304 },
  // Santa Catarina
  'Florianópolis, SC': { lat: -27.5954, lng: -48.5480 },
  'Joinville, SC': { lat: -26.3045, lng: -48.8487 },
  'Blumenau, SC': { lat: -26.9194, lng: -49.0661 },
  'Balneário Camboriú, SC': { lat: -26.9906, lng: -48.6352 },
  'Chapecó, SC': { lat: -27.0963, lng: -52.6158 },
  'Itajaí, SC': { lat: -26.9078, lng: -48.6619 },
  // Pernambuco
  'Recife, PE': { lat: -8.0476, lng: -34.8770 },
  'Olinda, PE': { lat: -8.0089, lng: -34.8553 },
  'Caruaru, PE': { lat: -8.2760, lng: -35.9819 },
  'Petrolina, PE': { lat: -9.3891, lng: -40.5006 },
  // Ceará
  'Fortaleza, CE': { lat: -3.7172, lng: -38.5433 },
  'Caucaia, CE': { lat: -3.7361, lng: -38.6531 },
  'Juazeiro do Norte, CE': { lat: -7.2131, lng: -39.3150 },
  'Sobral, CE': { lat: -3.6863, lng: -40.3486 },
  // Distrito Federal
  'Brasília, DF': { lat: -15.7975, lng: -47.8919 },
  // Goiás
  'Goiânia, GO': { lat: -16.6869, lng: -49.2648 },
  'Aparecida de Goiânia, GO': { lat: -16.8198, lng: -49.2469 },
  'Anápolis, GO': { lat: -16.3281, lng: -48.9534 },
  'Rio Verde, GO': { lat: -17.7927, lng: -50.9292 },
  // Pará
  'Belém, PA': { lat: -1.4558, lng: -48.4902 },
  'Ananindeua, PA': { lat: -1.3658, lng: -48.3727 },
  'Santarém, PA': { lat: -2.4306, lng: -54.7086 },
  'Marabá, PA': { lat: -5.3685, lng: -49.1178 },
  // Amazonas
  'Manaus, AM': { lat: -3.1190, lng: -60.0217 },
  'Parintins, AM': { lat: -2.6286, lng: -56.7358 },
  // Maranhão
  'São Luís, MA': { lat: -2.5297, lng: -44.3028 },
  'Imperatriz, MA': { lat: -5.5264, lng: -47.4916 },
  // Espírito Santo
  'Vitória, ES': { lat: -20.3155, lng: -40.3128 },
  'Vila Velha, ES': { lat: -20.3297, lng: -40.2925 },
  'Serra, ES': { lat: -20.1285, lng: -40.3078 },
  'Cariacica, ES': { lat: -20.2636, lng: -40.4164 },
  // Rio Grande do Norte
  'Natal, RN': { lat: -5.7945, lng: -35.2110 },
  'Mossoró, RN': { lat: -5.1878, lng: -37.3441 },
  'Parnamirim, RN': { lat: -5.9156, lng: -35.2628 },
  // Paraíba
  'João Pessoa, PB': { lat: -7.1195, lng: -34.8450 },
  'Campina Grande, PB': { lat: -7.2306, lng: -35.8811 },
  // Alagoas
  'Maceió, AL': { lat: -9.6498, lng: -35.7089 },
  'Arapiraca, AL': { lat: -9.7525, lng: -36.6608 },
  // Piauí
  'Teresina, PI': { lat: -5.0920, lng: -42.8038 },
  'Parnaíba, PI': { lat: -2.9055, lng: -41.7769 },
  // Sergipe
  'Aracaju, SE': { lat: -10.9472, lng: -37.0731 },
  // Mato Grosso
  'Cuiabá, MT': { lat: -15.6014, lng: -56.0979 },
  'Várzea Grande, MT': { lat: -15.6458, lng: -56.1325 },
  'Rondonópolis, MT': { lat: -16.4709, lng: -54.6356 },
  // Mato Grosso do Sul
  'Campo Grande, MS': { lat: -20.4697, lng: -54.6201 },
  'Dourados, MS': { lat: -22.2231, lng: -54.8118 },
  'Três Lagoas, MS': { lat: -20.7849, lng: -51.7008 },
  // Rondônia
  'Porto Velho, RO': { lat: -8.7612, lng: -63.9004 },
  'Ji-Paraná, RO': { lat: -10.8853, lng: -61.9517 },
  // Tocantins
  'Palmas, TO': { lat: -10.1689, lng: -48.3317 },
  'Araguaína, TO': { lat: -7.1919, lng: -48.2075 },
  // Acre
  'Rio Branco, AC': { lat: -9.9753, lng: -67.8249 },
  // Amapá
  'Macapá, AP': { lat: 0.0389, lng: -51.0664 },
  // Roraima
  'Boa Vista, RR': { lat: 2.8235, lng: -60.6758 },
};

// Get coordinates for a location string
function getCoordinates(location: string): { lat: number; lng: number } | null {
  // Try exact match first
  if (CITY_COORDINATES[location]) {
    return CITY_COORDINATES[location];
  }
  
  // Try matching just the city name
  const cityPart = location.split(',')[0]?.trim();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (key.startsWith(cityPart + ',')) {
      return coords;
    }
  }
  
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

export function NearbyMap({ tasks, userLocation, onTaskClick }: NearbyMapProps) {
  const { t } = useLanguage();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]); // Default: Brasília
  
  useEffect(() => {
    if (userLocation) {
      const coords = getCoordinates(userLocation);
      if (coords) {
        setMapCenter([coords.lat, coords.lng]);
      }
    }
  }, [userLocation]);
  
  // Get tasks with valid coordinates
  const tasksWithCoords = tasks
    .filter(task => task.location)
    .map(task => {
      const coords = getCoordinates(task.location!);
      return coords ? { task, coords } : null;
    })
    .filter(Boolean) as Array<{ task: Task; coords: { lat: number; lng: number } }>;
  
  // Create custom icon for tasks
  const taskIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  
  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-border">
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
