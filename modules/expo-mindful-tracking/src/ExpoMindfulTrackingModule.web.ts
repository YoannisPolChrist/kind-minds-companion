import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoMindfulTracking.types';

type ExpoMindfulTrackingModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoMindfulTrackingModule extends NativeModule<ExpoMindfulTrackingModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoMindfulTrackingModule, 'ExpoMindfulTrackingModule');
