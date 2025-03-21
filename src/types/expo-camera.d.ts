declare module 'expo-camera' {
  import { ViewProps } from 'react-native';
  import React from 'react';

  export interface BarCodeScanningResult {
    type: string;
    data: string;
  }

  export interface CameraProps extends ViewProps {
    onBarCodeScanned?: (result: BarCodeScanningResult) => void;
    ratio?: string;
    type?: 'front' | 'back';
    flashMode?: 'on' | 'off' | 'auto' | 'torch';
  }

  export class Camera extends React.Component<CameraProps> {
    static requestCameraPermissionsAsync(): Promise<{ status: 'granted' | 'denied' }>;
  }
}
