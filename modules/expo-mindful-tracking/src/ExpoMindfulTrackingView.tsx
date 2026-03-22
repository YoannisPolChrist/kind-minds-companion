import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoMindfulTrackingViewProps } from './ExpoMindfulTracking.types';

const NativeView: React.ComponentType<ExpoMindfulTrackingViewProps> =
  requireNativeView('ExpoMindfulTracking');

export default function ExpoMindfulTrackingView(props: ExpoMindfulTrackingViewProps) {
  return <NativeView {...props} />;
}
