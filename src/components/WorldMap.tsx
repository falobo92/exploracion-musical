import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MusicMix } from '@/types';
import { getContinentStyle } from '@/constants/continents';

interface WorldMapProps {
  mixes: MusicMix[];
  onSelect: (mix: MusicMix) => void;
  onPlay: (mix: MusicMix) => void;
  selectedId?: string;
  playingId?: string;
  className?: string;
}

const NOTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/></svg>`;

const EQ_BARS_SVG = `
  <div class="marker-eq">
    <span class="marker-eq-bar" style="--bar-h:60%;--bar-d:0s;--bar-s:0.45s"></span>
    <span class="marker-eq-bar" style="--bar-h:100%;--bar-d:0.12s;--bar-s:0.55s"></span>
    <span class="marker-eq-bar" style="--bar-h:75%;--bar-d:0.06s;--bar-s:0.4s"></span>
    <span class="marker-eq-bar" style="--bar-h:90%;--bar-d:0.18s;--bar-s:0.5s"></span>
  </div>
`;

function createMarkerIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 44 : 32;

  const innerContent = isSelected ? EQ_BARS_SVG : `<span class="map-marker-icon" style="color:${color}">${NOTE_SVG}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
    html: `
      <div class="map-marker ${isSelected ? 'map-marker--selected' : ''}" style="width:${size}px;height:${size}px;--marker-color:${color}">
        ${isSelected ? `<div class="map-marker-pulse"></div><div class="map-marker-pulse map-marker-pulse--delayed"></div>` : ''}
        ${isSelected ? `<div class="map-marker-ring"></div>` : ''}
        <div class="map-marker-circle ${isSelected ? 'selected' : ''}">
          ${innerContent}
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
  isPlaying: boolean;
  onSelect: (mix: MusicMix) => void;
  onPlay: (mix: MusicMix) => void;
}> = React.memo(({ mix, isSelected, isPlaying, onSelect, onPlay }) => {
  const style = getContinentStyle(mix.continent);
  const icon = useMemo(
    () => createMarkerIcon(style.markerColor, isSelected || isPlaying),
    [style.markerColor, isSelected, isPlaying]
  );

  const ytMusicUrl = mix.videoId
    ? `https://music.youtube.com/watch?v=${mix.videoId}`
    : `https://music.youtube.com/search?q=${encodeURIComponent(mix.searchQuery)}`;

  return (
    <Marker
      position={[mix.coordinates.lat, mix.coordinates.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(mix) }}
      zIndexOffset={isSelected || isPlaying ? 1000 : 0}
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

          <div className="map-popup-actions">
            <button
              className="map-popup-btn map-popup-btn--play"
              onClick={(e) => { e.stopPropagation(); onPlay(mix); }}
            >
              {isPlaying ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                  Pausar
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  Reproducir
                </>
              )}
            </button>
            <a
              href={ytMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-popup-btn map-popup-btn--yt"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8z"/>
                <path d="M10 15l5-3-5-3v6z"/>
              </svg>
              YouTube Music
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

MixMarkerComponent.displayName = 'MixMarker';

export const WorldMap: React.FC<WorldMapProps> = ({ mixes, onSelect, onPlay, selectedId, playingId, className }) => {
  const flyToMix = useMemo(
    () => mixes.find(m => m.id === selectedId || m.id === playingId) ?? null,
    [mixes, selectedId, playingId]
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
        <FlyToSelected mix={flyToMix} />
        {mixes.map(mix => (
          <MixMarkerComponent
            key={mix.id}
            mix={mix}
            isSelected={mix.id === selectedId}
            isPlaying={mix.id === playingId}
            onSelect={onSelect}
            onPlay={onPlay}
          />
        ))}
      </MapContainer>
    </div>
  );
};
