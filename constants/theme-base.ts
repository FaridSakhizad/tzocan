import { UiTheme } from '@/constants/ui-theme.types';

type ThemeScales = Pick<UiTheme, 'radius' | 'spacing' | 'typography' | 'image'>;

export const themeBaseScales: ThemeScales = {
  radius: {
    sm: 4,
    md: 8,
    lg: 10,
    xl: 20,
    pill: 20,
    pillSm: 7,
    pillMd: 9,
    panelTop: 33,
    panelBottom: 27,
  },
  spacing: {
    xxs: 2,
    xs: 3,
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    screenX: 20,
    screenHeaderTop: 24,
    screenHeaderBottom: 18,
    screenBottom: 32,
    cardX: 16,
    cardY: 14,
    sectionGap: 12,
    modalX: 40,
    modalInnerX: 23,
    modalInnerY: 20,
    modalActionsGap: 10,
  },
  typography: {
    titleSm: {
      fontSize: 16,
      lineHeight: 22,
    },
    titleLg: {
      fontSize: 22,
      lineHeight: 28,
    },
    screenTitle: {
      fontSize: 31,
      lineHeight: 37,
    },
    screenSubtitle: {
      fontSize: 15,
      lineHeight: 21,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
    },
    helper: {
      fontSize: 13,
      lineHeight: 18,
    },
    control: {
      fontSize: 16,
    },
  },
  image: {
    modalBackgroundScale: 2,
    modalBackgroundSource: require('@/assets/images/bg--main-1.jpg'),
  },
};
