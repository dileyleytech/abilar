// geo.ts — utilidades geográficas puras (matching por raio).

export interface LatLng {
  lat: number;
  lng: number;
}

const R_KM = 6371; // raio da Terra
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True se `point` está dentro de `radiusKm` de `center`. */
export function isWithinRadius(center: LatLng, point: LatLng, radiusKm: number): boolean {
  return haversineKm(center, point) <= radiusKm;
}
