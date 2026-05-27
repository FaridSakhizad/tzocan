export const SUPPORT_PRODUCT_CONFIGS = [
  {
    id: 'com.faridsakhizad.timecross.support3',
    label: 'text3',
    tier: 'standard',
  },
  {
    id: 'com.faridsakhizad.timecross.support5',
    label: 'text5',
    tier: 'standard',
  },
  {
    id: 'com.faridsakhizad.timecross.support10',
    label: 'text10',
    tier: 'standard',
  },
  {
    id: 'com.faridsakhizad.timecross.support25',
    label: 'text25',
    tier: 'future',
  },
  {
    id: 'com.faridsakhizad.timecross.support50',
    label: 'text50',
    tier: 'future',
  },
  {
    id: 'com.faridsakhizad.timecross.support100',
    label: 'text100',
    tier: 'future',
  },
] as const;

export const SUPPORT_PRODUCT_IDS = SUPPORT_PRODUCT_CONFIGS.map((product) => product.id);

export type SupportProductId = typeof SUPPORT_PRODUCT_CONFIGS[number]['id'];
