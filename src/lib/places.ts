import { env } from './env';

export interface PlaceMatch {
  placeId: string;
  displayName: string;
  formattedAddress?: string;
  location?: { lat: number; lng: number };
  types?: string[];
  website?: string;
  phone?: string;
  rating?: number;
  ratingCount?: number;
  priceLevel?: number;
  mapsUrl: string;
}

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1';

export async function searchPlaces(candidate: string, regionCode?: string): Promise<any[]> {
  if (!env.GOOGLE_MAPS_API_KEY) return [];
  const body = {
    textQuery: candidate,
    languageCode: 'en',
    regionCode: regionCode || 'SG',
  } as any;
  const res = await fetch(`${PLACES_ENDPOINT}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': '*',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.places) ? data.places : [];
}

export function mapsUrlForPlaceId(placeId: string): string {
  return `https://maps.google.com/?q=place_id:${encodeURIComponent(placeId)}`;
}

export function coerceMatch(p: any): PlaceMatch {
  const loc = p.location?.latitude ? { lat: p.location.latitude, lng: p.location.longitude } : undefined;
  return {
    placeId: p.id || p.placeId || p.id?.replace(/^places\//, ''),
    displayName: p.displayName?.text || p.displayName || p.name,
    formattedAddress: p.formattedAddress,
    location: loc,
    types: p.types || [],
    website: p.websiteUri,
    phone: p.internationalPhoneNumber,
    rating: p.rating,
    ratingCount: p.userRatingCount,
    priceLevel: p.priceLevel,
    mapsUrl: mapsUrlForPlaceId((p.id || '').replace(/^places\//, '')),
  };
}

