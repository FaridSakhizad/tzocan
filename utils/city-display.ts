import { SelectedCity } from '@/contexts/selected-cities-context';

export function getCityBaseName(city: SelectedCity, localizedName?: string | null) {
  return localizedName || city.name;
}

export function getCityDisplayName(city: SelectedCity, localizedName?: string | null) {
  return city.customName || getCityBaseName(city, localizedName);
}
