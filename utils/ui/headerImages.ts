import { ImageSourcePropType, Platform } from 'react-native';

const nativeHeaderImages: ImageSourcePropType[] = [
  require('../../assets/HomeUi1.webp'),
  require('../../assets/HomeUi2.webp'),
  require('../../assets/HomeUi3.webp'),
  require('../../assets/HomeUi4.webp'),
  require('../../assets/HomeUi5.webp'),
  require('../../assets/HomeUi6.webp'),
];

const webHeaderImages = [
  '/images/HomeUi1.webp',
  '/images/HomeUi2.webp',
  '/images/HomeUi3.webp',
  '/images/HomeUi4.webp',
  '/images/HomeUi5.webp',
  '/images/HomeUi6.webp',
];

function hashSeed(seed: string) {
  return seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function getHeaderImageSource(seed = 'kind-minds'): ImageSourcePropType {
  const index = hashSeed(seed) % nativeHeaderImages.length;
  return Platform.OS === 'web'
    ? ({ uri: webHeaderImages[index] } as ImageSourcePropType)
    : nativeHeaderImages[index];
}
