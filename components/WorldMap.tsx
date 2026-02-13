import React from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { MusicMix } from '../types';

interface WorldMapProps {
  mixes: MusicMix[];
  onSelect: (mix: MusicMix) => void;
  selectedId?: string;
  apiKey: string;
}

// Custom Dark Mode Style to match Zinc-950 theme
const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#18181b" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
];

export const WorldMap: React.FC<WorldMapProps> = ({ mixes, onSelect, selectedId, apiKey }) => {
  if (!apiKey) {
    return (
      <div className="w-full h-[400px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center mb-8">
        <div className="text-center p-6">
           <p className="text-zinc-500 mb-2">Google Maps API Key required.</p>
           <p className="text-zinc-600 text-xs">Configure it in Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-zinc-800 shadow-xl mb-8 relative z-0">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: 20, lng: 0 }}
          defaultZoom={2}
          styles={mapStyles}
          disableDefaultUI={true}
          gestureHandling={'cooperative'}
          className="w-full h-full"
        >
          {mixes.map((mix) => {
            const isSelected = mix.id === selectedId;
            return (
              <Marker
                key={mix.id}
                position={{ lat: mix.coordinates.lat, lng: mix.coordinates.lng }}
                onClick={() => onSelect(mix)}
                title={`${mix.artist} (${mix.country})`}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                  fillColor: isSelected ? "#6366f1" : "#a1a1aa",
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: "#09090b",
                  scale: 1.5,
                  anchor: { x: 12, y: 22 } as any
                }}
              />
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
};