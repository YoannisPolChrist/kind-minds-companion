import * as React from 'react';

import { ExpoMindfulTrackingViewProps } from './ExpoMindfulTracking.types';

export default function ExpoMindfulTrackingView(props: ExpoMindfulTrackingViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
