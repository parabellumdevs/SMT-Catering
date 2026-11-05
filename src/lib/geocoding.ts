import { BASE_LOCATION, distanceKm } from '@shared/geo'

export interface AddressSuggestion {
  id: string
  label: string
  lat: number
  lng: number
  /** Distancia en línea recta al punto base, en km. */
  distanceKm: number
}

interface PhotonFeature {
  properties: {
    osm_id: number
    osm_type: string
    name?: string
    housenumber?: string
    street?: string
    district?: string
    locality?: string
    city?: string
    state?: string
    countrycode?: string
  }
  /** GeoJSON: primero longitud, después latitud. */
  geometry: { coordinates: [number, number] }
}

const PHOTON_URL = 'https://photon.komoot.io/api/'

function buildLabel(p: PhotonFeature['properties']): string {
  const street = [p.street ?? p.name, p.housenumber].filter(Boolean).join(' ')
  const showState = p.state && p.state !== p.city && !p.state.startsWith('Autonomous')
  return [street, p.district ?? p.locality, p.city, showState ? p.state : undefined]
    .filter(Boolean)
    .join(', ')
}

/**
 * Busca direcciones en Photon (OpenStreetMap), priorizando las cercanas al punto base.
 * Servicio público y gratuito, sin clave: usarlo con pocos pedidos (esperar a que el usuario deje de escribir).
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    lat: String(BASE_LOCATION.lat),
    lon: String(BASE_LOCATION.lng),
    limit: '5',
  })

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal })
  if (!res.ok) throw new Error('No se pudo buscar la dirección')

  const data = (await res.json()) as { features: PhotonFeature[] }

  return data.features
    .filter((f) => f.properties.countrycode === 'AR')
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates
      return {
        id: `${f.properties.osm_type}${f.properties.osm_id}`,
        label: buildLabel(f.properties),
        lat,
        lng,
        distanceKm: distanceKm(BASE_LOCATION, { lat, lng }),
      }
    })
}