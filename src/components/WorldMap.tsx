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

const NOTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/></svg>`;

function createMarkerIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 40 : 32;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
    html: `
      <div class="map-marker ${isSelected ? 'map-marker--selected' : ''}" style="width:${size}px;height:${size}px;--marker-color:${color}">
        ${isSelected ? `<div class="map-marker-pulse" style="--marker-color:${color}"></div>` : ''}
        <div class="map-marker-circle ${isSelected ? 'selected' : ''}" style="--marker-color:${color}">
          <span class="map-marker-icon" style="color:${color}">${NOTE_SVG}</span>
        </div>
      </div>
    `,
  });
}

const FlyToSelected: React.FC<{ mix: MusicMix | null }> = ({ mix }) => {
  const map = useMap();
  React.useEffect(() => {
    if (mix) {
      map.flyTo([mix.coordinates.lat, mix.coordinates.lng], 5, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
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
        <div className="map-popup-card">
          <div className="map-popup-header">
            <div className="map-popup-dot" style={{
              background: style.markerColor,
              boxShadow: `0 0 8px ${style.markerColor}`,
            }} />
            <div className="map-popup-artist">{mix.artist}</div>
          </div>
          {mix.songTitle && (
            <div className="map-popup-song">{mix.songTitle}</div>
          )}
          <div className="map-popup-style">{mix.style}</div>
          <div className="map-popup-meta">
            <span>{mix.country}</span>
            <span className="map-popup-sep">&middot;</span>
            <span>{mix.year}</span>
            <span className="map-popup-sep">&middot;</span>
            <span>{mix.bpm} BPM</span>
          </div>
          <div className="map-popup-desc">{mix.description}</div>
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
    <div className={className || "map-container-wrapper"}>
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
