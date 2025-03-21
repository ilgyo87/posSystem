import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

type BarcodeScannerProps = NativeStackScreenProps<RootStackParamList, 'BarcodeScanner'>;

// Mock barcode values for testing fallback mode
const SAMPLE_BARCODES = [
  { code: '123456789012', description: 'Sample Product 1' },
  { code: '789012345678', description: 'Sample Product 2' },
  { code: '456789012345', description: 'Sample Product 3' },
];

export default function BarcodeScanner({ route, navigation }: BarcodeScannerProps) {
  const { onScan } = route.params;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showMockScanner, setShowMockScanner] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Request camera permission
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status !== 'granted') {
          // If permission denied, show mock scanner
          setShowMockScanner(true);
        }
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        setHasPermission(false);
        setShowMockScanner(true);
      }
    })();
  }, []);

  const handleScan = (code: string) => {
    setScanned(true);
    setLoading(true);
    // Simulate processing time
    setTimeout(() => {
      setLoading(false);
      if (onScan) {
        onScan(code);
      }
      navigation.goBack();
    }, 500);
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!scanned) {
      handleScan(data);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleShowMockScanner = () => {
    setShowMockScanner(true);
  };

  const handleManualEntry = () => {
    if (manualCode.trim().length > 0) {
      handleScan(manualCode.trim());
    }
  };

  // Display loading indicator while processing scan
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 20 }}>Processing barcode...</Text>
      </View>
    );
  }

  // Show mock scanner if permissions denied or user chooses manual entry
  if (showMockScanner) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Barcode Scanner</Text>
          <Text style={styles.subHeaderText}>
            Enter a barcode manually or select a sample
          </Text>
        </View>

        <ScrollView style={styles.mockScannerContainer}>
          <View style={styles.manualEntryContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter barcode manually"
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="number-pad"
            />
            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={handleManualEntry}
            >
              <Text style={styles.scanButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sampleTitle}>Sample Barcodes:</Text>
          
          {SAMPLE_BARCODES.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.barcodeItem}
              onPress={() => handleScan(item.code)}
            >
              <Text style={styles.barcodeCode}>{item.code}</Text>
              <Text style={styles.barcodeDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check for permission status
  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={handleShowMockScanner}>
          <Text style={styles.buttonText}>Enter Barcode Manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera scanner view
  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        ratio="16:9"
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.focusedContainer}>
              <View style={styles.scannerGuide}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
              </View>
            </View>
            <View style={styles.unfocusedContainer}></View>
          </View>
          <View style={styles.unfocusedContainer}></View>
          
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.cancelButtonCamera} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.manualEntryButton} onPress={handleShowMockScanner}>
              <Text style={styles.scanButtonText}>Manual Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  mockScannerContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subHeaderText: {
    color: 'white',
    fontSize: 16,
    marginTop: 5,
  },
  manualEntryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    marginRight: 10,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  scanButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sampleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  barcodeItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  barcodeCode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  barcodeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Camera overlay styles
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleContainer: {
    flexDirection: 'row',
    flex: 1.5,
  },
  focusedContainer: {
    flex: 6,
  },
  scannerGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  cancelButtonCamera: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  manualEntryButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
});
