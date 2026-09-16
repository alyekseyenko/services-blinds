export interface GeocodeResult {
  coords: [number, number];
  provider: 'nominatim' | 'google_places' | 'google_geocoding';
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    console.log('--- Geocoding Strategy: Starting for address:', address);
    
    // 1. Tentar primeiro o Nominatim (OpenStreetMap) - 100% GRATUITO
    try {
      console.log('Step 1: Trying Nominatim (Free)...');
      const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
        headers: {
          'User-Agent': 'HabitarmosTechApp/1.0'
        }
      });
      
      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        if (nominatimData && nominatimData.length > 0) {
          const coords: [number, number] = [parseFloat(nominatimData[0].lat), parseFloat(nominatimData[0].lon)];
          console.log('✅ Success with Nominatim (Free):', coords);
          return { coords, provider: 'nominatim' };
        }
      }
      console.log('⚠️ Nominatim did not find the address.');
    } catch (e: any) {
      console.log('❌ Nominatim error (skipping to Google):', e.message);
    }

    // 2. Fallback para Google Maps - APENAS SE O GRÁTIS FALHAR
    console.log('Step 2: Falling back to Google Maps (Paid)...');
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!googleApiKey) {
      console.log('⚠️ No Google API Key found, cannot fallback.');
      return null;
    }

    // Tentar Places API
    const placesResponse = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(address)}&inputtype=textquery&fields=geometry&key=${googleApiKey}`);
    
    if (placesResponse.ok) {
      const placesData = await placesResponse.json();
      if (placesData.status === 'OK' && placesData.candidates && placesData.candidates.length > 0) {
        const location = placesData.candidates[0].geometry.location;
        const coords: [number, number] = [location.lat, location.lng];
        console.log('✅ Success with Google Places:', coords);
        return { coords, provider: 'google_places' };
      }
    }

    // Tentar Geocoding API normal
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const coords: [number, number] = [location.lat, location.lng];
        console.log('✅ Success with Google Geocoding:', coords);
        return { coords, provider: 'google_geocoding' };
      }
    }
    
    console.log('❌ All geocoding methods failed for:', address);
    return null;
  } catch (error) {
    console.error('CRITICAL: Geocoding error:', error);
    return null;
  }
}
