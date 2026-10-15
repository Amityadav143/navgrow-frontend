/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * All 28 states and 8 union territories of India, plus a normaliser for the
 * spellings returned by pincode / geolocation lookups ("Orissa", "Jammu & Kashmir",
 * "Pondicherry", the pre-2020 Dadra / Daman split…). Shared by checkout and the
 * RFQ form so a buyer anywhere in India can pick their state.
 */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const DNHDD = 'Dadra and Nagar Haveli and Daman and Diu';
const ALIASES = {
  'orissa': 'Odisha',
  'pondicherry': 'Puducherry',
  'uttaranchal': 'Uttarakhand',
  'chattisgarh': 'Chhattisgarh',
  'nct of delhi': 'Delhi',
  'new delhi': 'Delhi',
  'national capital territory of delhi': 'Delhi',
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'jammu kashmir': 'Jammu and Kashmir',
  'dadra and nagar haveli': DNHDD,
  'daman and diu': DNHDD,
  'the dadra and nagar haveli and daman and diu': DNHDD,
};

/** Canonical state name for any common spelling, or '' if unknown. */
export function normalizeState(name) {
  if (!name) return '';
  const key = String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const direct = INDIAN_STATES.find(s => s.toLowerCase() === key);
  return direct || ALIASES[key] || '';
}

export default INDIAN_STATES;
