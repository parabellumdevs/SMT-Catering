export interface GeoPoint {
  lat: number
  lng: number
}

/** Punto base desde el cual se mide el radio de cobertura. */
export const BASE_LOCATION: GeoPoint & { address: string } = {
  address: 'Venezuela 1478, Monserrat, Ciudad Autónoma de Buenos Aires',
  lat: -34.6146895821359,
  lng: -58.38715865469588,
}

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** Distancia en línea recta (km) entre dos puntos, con la fórmula de Haversine. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}