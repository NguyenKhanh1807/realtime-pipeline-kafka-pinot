/**
 * Maps country names to ISO 3166-1 alpha-2 country codes
 * Used for displaying country flags with react-country-flag
 */
export const countryCodeMap: Record<string, string> = {
  'United States': 'US',
  'United Kingdom': 'GB',
  'Germany': 'DE',
  'China': 'CN',
  'Japan': 'JP',
  'India': 'IN',
  'Canada': 'CA',
  'Australia': 'AU',
  'France': 'FR',
  'Brazil': 'BR',
  'Italy': 'IT',
  'Spain': 'ES',
  'South Korea': 'KR',
  'Mexico': 'MX',
  'Russia': 'RU',
  'Netherlands': 'NL',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Belgium': 'BE',
  'Poland': 'PL',
  'Argentina': 'AR',
  'South Africa': 'ZA',
  'Turkey': 'TR',
  'Saudi Arabia': 'SA',
  'Indonesia': 'ID',
  'Thailand': 'TH',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Philippines': 'PH',
  'Vietnam': 'VN',
  'New Zealand': 'NZ',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Ireland': 'IE',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Czech Republic': 'CZ',
  'Romania': 'RO',
  'Hungary': 'HU',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Venezuela': 'VE',
  'Egypt': 'EG',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Israel': 'IL',
  'United Arab Emirates': 'AE',
  'Qatar': 'QA',
  'Kuwait': 'KW',
  'Bangladesh': 'BD',
  'Pakistan': 'PK',
  'Sri Lanka': 'LK',
};

/**
 * Get ISO country code from country name
 * @param countryName - The name of the country
 * @returns ISO 3166-1 alpha-2 country code or undefined if not found
 */
export function getCountryCode(countryName: string): string | undefined {
  return countryCodeMap[countryName];
}

