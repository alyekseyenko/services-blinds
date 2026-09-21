"use server";
import { geocodeAddress as sharedGeocodeAddress } from './geocoder';

export async function serverGeocodeAddress(address) {
  const result = await sharedGeocodeAddress(address);
  return result ? result.coords : null;
}
