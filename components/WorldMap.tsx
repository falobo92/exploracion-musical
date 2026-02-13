import React, { useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useAdvancedMarkerRef, Pin } from '@vis.gl/react-google-maps';
import { MusicMix } from '../types';

interface WorldMapProps {
  mixes: MusicMix[];
  onSelect: (mix: MusicMix) => void;
  selectedId?: string;
  apiKey: string;
}

// Colores por continente
const continentColors: Record<string, { bg: string; border: string; glyph: string }> = {
  'África':             { bg: '#f59e0b', border: '#d97706', glyph: '#ffffff' },
  'Africa':             { bg: '#f59e0b', border: '#d97706', glyph: '#ffffff' },
  'Asia':               { bg: '#ef4444', border: '#dc2626', glyph: '#ffffff' },
  'Europa':             { bg: '#6366f1', border: '#4f46e5', glyph: '#ffffff' },
  'Europe':             { bg: '#6366f1', border: '#4f46e5', glyph: '#ffffff' },
  'América del Norte':  { bg: '#0ea5e9', border: '#0284c7', glyph: '#ffffff' },
  'North America':      { bg: '#0ea5e9', border: '#0284c7', glyph: '#ffffff' },
  'América del Sur':    { bg: '#10b981', border: '#059669', glyph: '#ffffff' },
  'South America':      { bg: '#10b981', border: '#059669', glyph: '#ffffff' },
  'Oceanía':            { bg: '#ec4899', border: '#db2777', glyph: '#ffffff' },
  'Oceania':            { bg: '#ec4899', border: '#db2777', glyph: '#ffffff' },
};

const getColors = (continent: string) => {
  return continentColors[continent] || { bg: '#8b5cf6', border: '#7c3aed', glyph: '#ffffff' };
};

// Componente de marcador individual
const MixMarker: React.FC<{
  mix: MusicMix;
  isSelected: boolean;
  onSelect: (mix: MusicMix) => void;
  selectedId?: string;
  setInfoMix: (mix: MusicMix | null) => void;
  infoMix: MusicMix | null;
}> = ({ mix, isSelected, onSelect, setInfoMix, infoMix }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const colors = getColors(mix.continent);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: mix.coordinates.lat, lng: mix.coordinates.lng }}
        title={`${mix.artist} — ${mix.country}`}
        onClick={() => {
          onSelect(mix);
          setInfoMix(mix);
        }}
        zIndex={isSelected ? 100 : 1}
      >
        <Pin
          background={isSelected ? '#4f46e5' : colors.bg}
          borderColor={isSelected ? '#312e81' : colors.border}
          glyphColor={colors.glyph}
          scale={isSelected ? 1.3 : 1}
        />
      </AdvancedMarker>
      {infoMix?.id === mix.id && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoMix(null)}>
          <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180, padding: '4px 0' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: '#18181b' }}>{mix.artist}</div>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginBottom: 4 }}>{mix.style}</div>
            <div style={{ fontSize: 11, color: '#71717a' }}>{mix.country} · {mix.year} · {mix.bpm} BPM</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, lineHeight: 1.4 }}>{mix.description}</div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const WorldMap: React.FC<WorldMapProps> = ({ mixes, onSelect, selectedId, apiKey }) => {
  const [infoMix, setInfoMix] = React.useState<MusicMix | null>(null);

  if (!apiKey) {
    return (
      <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 flex items-center justify-center mb-8">
        <div className="text-center p-6">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-zinc-400 mb-1 font-medium">Google Maps necesita una API Key</p>
          <p className="text-zinc-600 text-sm">Configúrala en Ajustes para ver el mapa mundial.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-zinc-700 shadow-xl mb-8 relative z-0">
      <APIProvider apiKey={apiKey} language="es" region="ES">
        <Map
          defaultCenter={{ lat: 20, lng: 0 }}
          defaultZoom={2}
          minZoom={2}
          maxZoom={14}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          mapId="DEMO_MAP_ID"
          className="w-full h-full"
        >
          {mixes.map((mix) => (
            <MixMarker
              key={mix.id}
              mix={mix}
              isSelected={mix.id === selectedId}
              onSelect={onSelect}
              setInfoMix={setInfoMix}
              infoMix={infoMix}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
};
