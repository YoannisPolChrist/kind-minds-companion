import React, { ReactNode, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { DarkAmbientOrbs } from '../ui/AmbientOrbs';
import { getHeaderImageSource } from '../../utils/ui/headerImages';

interface TherapistHeroBannerProps {
  children: ReactNode;
  seed?: string;
  baseColor?: string;
  contentMaxWidth?: number;
  paddingBottom?: number;
}

export function TherapistHeroBanner({
  children,
  seed = 'kind-minds',
  baseColor = '#137386',
  contentMaxWidth = 1080,
  paddingBottom = 28,
}: TherapistHeroBannerProps) {
  const source = useMemo(() => getHeaderImageSource(seed), [seed]);

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: baseColor,
          paddingTop: Platform.OS === 'android' ? 48 : 64,
          paddingBottom,
        },
      ]}
    >
      <Image source={source} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={['rgba(9, 42, 48, 0.20)', 'rgba(19, 115, 134, 0.88)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(19, 115, 134, 0.18)' }]} />
      <DarkAmbientOrbs />
      <View style={[styles.content, { maxWidth: contentMaxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: 24,
    shadowColor: '#0f1f24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
  },
});
