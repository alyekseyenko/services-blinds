import "server-only";

import { geocodeAddress as sharedGeocodeAddress } from "./geocoder";

export async function serverGeocodeAddress(
  address: string
): Promise<[number, number] | null> {
  const result = await sharedGeocodeAddress(address);
  return result ? result.coords : null;
}
