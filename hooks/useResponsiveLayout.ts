import { Platform, useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  const isXs = width < 380;
  const isSm = width < 600;
  const isMd = width >= 600 && width < 900;
  const isLg = width >= 900 && width < 1200;
  const isXl = width >= 1200;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isMobileWeb = Platform.OS === 'web' && width < 768;

  const contentMaxWidth = isSm ? undefined : isDesktop ? 720 : 600;
  const gutter = isXs ? 14 : isSm ? 16 : isMd ? 24 : 32;
  const sectionGap = isXs ? 10 : 12;
  const compactCardPadding = isXs ? 16 : isSm ? 18 : 24;
  const headerTop = Platform.OS === 'android'
    ? (isXs ? 52 : 64)
    : (isXs ? 56 : 72);

  return {
    width,
    height,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isTablet,
    isDesktop,
    isMobileWeb,
    contentMaxWidth,
    gutter,
    sectionGap,
    compactCardPadding,
    headerTop,
  };
}
