import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MusicMix } from '@/types';
import { getContinentStyle } from '@/constants/continents';

interface WorldMapProps {
  mixes: MusicMix[];
  onSelect: (mix: MusicMix) => void;
  selectedId?: string;
  className?: string;
}

function createMarkerIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 22 : 16;

  return L.divIcon({
    className: '',
    iconSize: [size + 20, size + 20],
    iconAnchor: [(size + 20) / 2, (size + 20) / 2],
    html: `
      <div class="map-marker" style="width:${size + 20}px;height:${size + 20}px;--marker-color:${color}">
        ${isSelected ? `<div class="map-marker-pulse" style="--marker-color:${color}"></div>` : ''}
        <div class="map-marker-dot ${isSelected ? 'selected' : ''}" style="background:${color};--marker-color:${color}"></div>
      </div>
    `,
  });
}

const FlyToSelected: React.FC<{ mix: MusicMix | null }> = ({ mix }) => {
  const map = useMap();
  React.useEffect(() => {
    if (mix) {
      map.flyTo([mix.coordinates.lat, mix.coordinates.lng], 5, { duration: 0.8 });
    }
  }, [mix, map]);
  return null;
};

const MixMarkerComponent: React.FC<{
  mix: MusicMix;
  isSelected: boolean;
  onSelect: (mix: MusicMix) => void;
}> = React.memo(({ mix, isSelected, onSelect }) => {
  const style = getContinentStyle(mix.continent);
  const icon = useMemo(
    () => createMarkerIcon(style.markerColor, isSelected),
    [style.markerColor, isSelected]
  );

  return (
    <Marker
      position={[mix.coordinates.lat, mix.coordinates.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(mix) }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup>
        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200, padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: style.markerColor,
              boxShadow: `0 0 8px ${style.markerColor}`,
              flexShrink: 0,
            }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f4f4f5' }}>
              {mix.artist}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 600, marginBottom: 6, letterSpacing: '0.02em' }}>
            {mix.style}
          </div>
          <div style={{
            display: 'flex', gap: 6, fontSize: 11, color: '#a1a1aa',
            borderTop: '1px solid rgba(63,63,70,0.4)', paddingTop: 6,
          }}>
            <span>{mix.country}</span>
            <span style={{ color: '#3f3f46' }}>·</span>
            <span>{mix.year}</span>
            <span style={{ color: '#3f3f46' }}>·</span>
            <span>{mix.bpm} BPM</span>
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 8, lineHeight: 1.5 }}>
            {mix.description}
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

MixMarkerComponent.displayName = 'MixMarker';

export const WorldMap: React.FC<WorldMapProps> = ({ mixes, onSelect, selectedId, className }) => {
  const selectedMix = useMemo(
    () => mixes.find(m => m.id === selectedId) ?? null,
    [mixes, selectedId]
  );

  return (
    <div className={className || "w-full h-[300px] sm:h-[420px] rounded-2xl overflow-hidden border border-zinc-800/40 shadow-2xl shadow-black/20 mb-6 relative z-0"}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
        attributionControl={true}
        zoomControl={true}
      >
        {/*
          Tiles oscuros con etiquetas en español.
          Usamos la capa de OpenStreetMap con renderizado CARTO oscuro
          y forzamos idioma español mediante la URL de tiles con parámetro de idioma.
        */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <FlyToSelected mix={selectedMix} />
        {mixes.map(mix => (
          <MixMarkerComponent
            key={mix.id}
            mix={mix}
            isSelected={mix.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>
    </div>
  );
};
