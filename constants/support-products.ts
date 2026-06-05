export const SUPPORT_PRODUCT_CONFIGS = [
  {
    id: 'com.faridsakhizad.timecross.support3',
    label: 'Love and Support',
    tier: 'standard',
  },
  {
    id: 'com.faridsakhizad.timecross.support5',
    label: 'Love, Support, and Coffee',
    tier: 'standard',
  },
  {
    id: 'com.faridsakhizad.timecross.support10',
    label: 'Legendary Support',
    tier: 'standard',
  },
  {
    id: 'com.faridsakhizad.timecross.support25',
    label: 'Sponsor Future Development',
    tier: 'future',
  },
  {
    id: 'com.faridsakhizad.timecross.support50',
    label: 'Major Support',
    tier: 'future',
  },
  {
    id: 'com.faridsakhizad.timecross.support100',
    label: 'Visionary Support',
    tier: 'future',
  },
] as const;

export const SUPPORT_PRODUCT_IDS = SUPPORT_PRODUCT_CONFIGS.map((product) => product.id);

export type SupportProductId = typeof SUPPORT_PRODUCT_CONFIGS[number]['id'];
