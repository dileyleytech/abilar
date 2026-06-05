'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from 'react-leaflet';

const AMBER = '#C56A33';
const GREEN = '#2F6B5E';

/** Reposiciona/enquadra o mapa quando a localização ou o raio mudam. */
function FitToRadius({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    // toBounds(diâmetro em metros) — não precisa do círculo anexado ao mapa.
    const bounds = L.latLng(lat, lng).toBounds(radiusKm * 1000 * 2);
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [16, 16] });
  }, [lat, lng, radiusKm, map]);
  return null;
}

/** Mostra a área de atendimento: ponto do marceneiro + círculo do raio. */
export default function ServiceAreaMap({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={11}
      scrollWheelZoom={false}
      className="h-64 w-full rounded-xl border border-subtle"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle center={[lat, lng]} radius={radiusKm * 1000} pathOptions={{ color: AMBER, fillColor: AMBER, fillOpacity: 0.12, weight: 2 }} />
      <CircleMarker center={[lat, lng]} radius={6} pathOptions={{ color: GREEN, fillColor: GREEN, fillOpacity: 1 }} />
      <FitToRadius lat={lat} lng={lng} radiusKm={radiusKm} />
    </MapContainer>
  );
}
