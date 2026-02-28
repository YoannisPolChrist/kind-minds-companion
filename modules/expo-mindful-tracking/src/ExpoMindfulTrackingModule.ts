import { NativeModule, requireNativeModule } from 'expo';

import { ExpoMindfulTrackingModuleEvents } from './ExpoMindfulTracking.types';

declare class ExpoMindfulTrackingModule extends NativeModule<ExpoMindfulTrackingModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoMindfulTrackingModule>('ExpoMindfulTracking');
