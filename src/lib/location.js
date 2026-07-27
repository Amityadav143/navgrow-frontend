/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Location helpers — turn a pincode into an area/city/state, and resolve the
 * device's live location into a pincode. Both are best-effort and never throw;
 * callers get a result or null.
 */

/**
 * Look up a pincode using the free India Post API (no key required).
 * Returns { pincode, area, district, state, areas[] } or null.
 */
export async function lookupPincode(pincode) {
  const pin = String(pincode || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const json = await res.json();
    const entry = Array.isArray(json) ? json[0] : json;
    if (!entry || entry.Status !== 'Success' || !entry.PostOffice?.length) return null;
    const offices = entry.PostOffice;
    const first = offices[0];
    return {
      pincode: pin,
      area: first.Name,
      district: first.District,
      state: first.State,
      // Distinct localities under this pincode, so the user can pick their area.
      areas: [...new Set(offices.map(o => o.Name))],
    };
  } catch {
    return null;
  }
}

/**
 * Reverse-geocode the device's current position into a pincode + address parts
 * using the free OpenStreetMap Nominatim service.
 * Returns { pincode, area, city, state } or throws a friendly Error.
 */
export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } },
          );
          const json = await res.json();
          const a = json.address || {};
          resolve({
            pincode: a.postcode ? String(a.postcode).replace(/\s/g, '').slice(0, 6) : '',
            area: a.suburb || a.neighbourhood || a.village || a.town || '',
            city: a.city || a.town || a.state_district || a.county || '',
            state: a.state || '',
          });
        } catch {
          reject(new Error("Couldn't determine your address. Please enter your PIN code."));
        }
      },
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Please enter your PIN code.'
          : "Couldn't get your location. Please enter your PIN code.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}
