import type { SearchResultType } from '@/services';

export const SEARCH_TYPE_ICON: Record<SearchResultType, string> = {
  asset: 'cube',
  device: 'microchip',
  location: 'map-marker',
  person: 'user',
  event: 'bell',
  occurrence: 'exclamation-triangle',
  request: 'wrench',
};
