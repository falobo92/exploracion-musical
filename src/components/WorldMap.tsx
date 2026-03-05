import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { MusicMix } from '@/types';
import { CONTINENT_OPTIONS, getContinentStyle } from '@/constants/continents';

interface WorldMapProps {
  mixes: MusicMix[];
  onSelect: (mix: MusicMix) => void;
  onPlay: (mix: MusicMix) => void;
  selectedId?: string;
  playingId?: string;
  className?: string;
  leftInset?: number;
  rightInset?: number;
  topInset?: number;
  bottomInset?: number;
  showLegend?: boolean;
  zoomPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
}

const NOTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><circle cx="12" cy="12" r="8" fill="currentColor" /><circle cx="12" cy="12" r="4" fill="var(--marker-color)" stroke="#fff" stroke-width="1.5" /></svg>`;

const EQ_BARS_SVG = `
  <div class="marker-eq">
    <span class="marker-eq-bar" style="--bar-h:50%;--bar-d:0s;--bar-s:0.4s"></span>
    <span class="marker-eq-bar" style="--bar-h:100%;--bar-d:0.1s;--bar-s:0.5s"></span>
    <span class="marker-eq-bar" style="--bar-h:60%;--bar-d:0.05s;--bar-s:0.35s"></span>
    <span class="marker-eq-bar" style="--bar-h:80%;--bar-d:0.15s;--bar-s:0.45s"></span>
  </div>
`;

function createClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    html: `
      <div class="map-cluster">
        <div class="map-cluster__inner">${count}</div>
      </div>
    `,
  });
}

function stableJitterFromId(id: string): { jitterLat: number; jitterLng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }

  const latSeed = Math.sin(hash) * 10000;
  const lngSeed = Math.sin(hash * 1.37) * 10000;
  const normalize = (seed: number) => seed - Math.floor(seed);

  return {
    jitterLat: (normalize(latSeed) - 0.5) * 0.08,
    jitterLng: (normalize(lngSeed) - 0.5) * 0.08,
  };
}

function createMarkerIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 48 : 36;

  const innerContent = isSelected ? EQ_BARS_SVG : `<span class="map-marker-icon" style="color:#ffffff">${NOTE_SVG}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 8],
    html: `
      <div class="map-marker ${isSelected ? 'map-marker--selected' : ''}" style="width:${size}px;height:${size}px;--marker-color:${color}">
        ${isSelected ? `
          <div class="map-marker-glow-bg"></div>
          <div class="map-marker-radar"></div>
          <div class="map-marker-pulse"></div>
          <div class="map-marker-pulse map-marker-pulse--delayed"></div>
        ` : `
          <div class="map-marker-ring-static"></div>
        `}
        <div class="map-marker-core ${isSelected ? 'selected' : ''}">
          ${innerContent}
        </div>
      </div>
    `,
  });
}

const FlyToSelected: React.FC<{
  mix: MusicMix | null;
  leftInset: number;
  rightInset: number;
  topInset: number;
  bottomInset: number;
}> = ({ mix, leftInset, rightInset, topInset, bottomInset }) => {
  const map = useMap();
  React.useEffect(() => {
    if (mix) {
      const targetZoom = 5;
      const point = map.project([mix.coordinates.lat, mix.coordinates.lng], targetZoom);
      const offsetX = (leftInset - rightInset) / 2;
      const offsetY = (topInset - bottomInset) / 2;
      const center = map.unproject(point.subtract([offsetX, offsetY]), targetZoom);

      map.flyTo(center, targetZoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [bottomInset, leftInset, mix, rightInset, topInset, map]);
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
      position={[mix.coordinates.lat + (mix.jitterLat || 0), mix.coordinates.lng + (mix.jitterLng || 0)]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(mix) }}
      zIndexOffset={isSelected || isPlaying ? 1000 : 0}
    >
      <Popup>
        <div className="flex flex-col min-w-[220px] max-w-[260px] font-sans">
          {/* Cover image area */}
          {mix.videoId && (
            <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden shadow-md bg-zinc-800">
              <img
                src={`https://img.youtube.com/vi/${mix.videoId}/mqdefault.jpg`}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />
              
              {/* Top badges */}
              <div className="absolute top-2 left-2 flex gap-1.5">
                <span 
                  className="px-1.5 py-0.5 rounded-md text-zinc-950 text-[9px] font-black tracking-widest uppercase shadow-sm"
                  style={{ backgroundColor: style.markerColor }}
                >
                  {mix.continent}
                </span>
              </div>

              {/* Play state indicator */}
              {isPlaying && (
                <div className="absolute bottom-2 right-2 flex gap-[2px] items-end h-3">
                  <div className="w-[2px] bg-emerald-400 rounded-full eq-bar" style={{ '--eq-duration': '0.5s', '--eq-delay': '0s' } as React.CSSProperties} />
                  <div className="w-[2px] bg-emerald-400 rounded-full eq-bar" style={{ '--eq-duration': '0.7s', '--eq-delay': '0.1s' } as React.CSSProperties} />
                  <div className="w-[2px] bg-emerald-400 rounded-full eq-bar" style={{ '--eq-duration': '0.45s', '--eq-delay': '0.2s' } as React.CSSProperties} />
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          <div className="flex items-start gap-2 mb-0.5">
            {!mix.videoId && (
              <div
                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{ background: style.markerColor, boxShadow: `0 0 8px ${style.markerColor}` }}
              />
            )}
            <h3 className="text-base font-black text-white leading-tight">
              {mix.artist}
            </h3>
          </div>

          {mix.songTitle && (
            <p className="text-xs font-bold text-emerald-300/90 mb-2 truncate">
              {mix.songTitle}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-zinc-300 text-[10px] font-bold tracking-wide">{mix.year}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-zinc-300 text-[10px] font-bold tracking-wide truncate max-w-[100px]">{mix.style}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-zinc-400 text-[10px] font-semibold tracking-wide">{mix.country}</span>
          </div>

          {/* Description */}
          <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-3 mb-4">
            {mix.description}
          </p>

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(mix); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isPlaying 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white text-zinc-900 hover:bg-zinc-200 border border-transparent'
              }`}
            >
              {isPlaying ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                  Pausar
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Reproducir
                </>
              )}
            </button>
            <a
              href={ytMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 rounded-xl bg-zinc-800/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700/50 hover:border-red-500/30 transition-all"
              onClick={(e) => e.stopPropagation()}
              title="Abrir en YouTube Music"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8z"/>
                <path d="M10 15l5-3-5-3v6z"/>
              </svg>
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

MixMarkerComponent.displayName = 'MixMarker';

export const WorldMap: React.FC<WorldMapProps> = ({
  mixes,
  onSelect,
  onPlay,
  selectedId,
  playingId,
  className,
  leftInset = 24,
  rightInset = 24,
  topInset = 24,
  bottomInset = 24,
  showLegend = true,
  zoomPosition = 'bottomright',
}) => {
  const flyToMix = useMemo(
    () => mixes.find(m => m.id === selectedId || m.id === playingId) ?? null,
    [mixes, selectedId, playingId]
  );

  // Añadir jitter determinístico para evitar saltos visuales entre renders.
  const mixesWithJitter = useMemo(() => {
    return mixes.map(mix => {
      if (mix.jitterLat !== undefined && mix.jitterLng !== undefined) return mix;
      const { jitterLat, jitterLng } = stableJitterFromId(mix.id);
      return { ...mix, jitterLat, jitterLng };
    });
  }, [mixes]);

  return (
    <div className={className || "map-container-wrapper"}>
      <div className="map-atmosphere pointer-events-none" />
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={14}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className="w-full h-full"
        attributionControl={true}
        zoomControl={false}
      >
        <ZoomControl position={zoomPosition} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
          noWrap={true}
          bounds={[[-90, -180], [90, 180]]}
        />
        <FlyToSelected
          mix={flyToMix}
          leftInset={leftInset}
          rightInset={rightInset}
          topInset={topInset}
          bottomInset={bottomInset}
        />
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
          spiderfyOnMaxZoom={true}
          iconCreateFunction={(cluster: any) => createClusterIcon(cluster.getChildCount())}
        >
          {mixesWithJitter.map(mix => (
            <MixMarkerComponent
              key={mix.id}
              mix={mix}
              isSelected={mix.id === selectedId}
              isPlaying={mix.id === playingId}
              onSelect={onSelect}
              onPlay={onPlay}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      {showLegend && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[6] hidden justify-center px-4 pt-[calc(var(--safe-top)+1.25rem)] lg:flex">
          <div className="map-legend">
            <div className="map-legend__title">Continentes</div>
            <div className="map-legend__items">
              {CONTINENT_OPTIONS.filter((option) => option.value).map((option) => {
                const continentStyle = getContinentStyle(option.value);
                return (
                  <div key={option.value} className="map-legend__item">
                    <span
                      className="map-legend__dot"
                      style={{ backgroundColor: continentStyle.markerColor }}
                    />
                    <span>{option.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
