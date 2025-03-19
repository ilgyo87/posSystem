import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

type BarcodeScannerProps = NativeStackScreenProps<RootStackParamList, 'BarcodeScanner'>;

// Mock barcode values for testing
const SAMPLE_BARCODES = [
  { code: '123456789012', description: 'Sample Product 1' },
  { code: '789012345678', description: 'Sample Product 2' },
  { code: '456789012345', description: 'Sample Product 3' },
];

export default function BarcodeScanner({ route, navigation }: BarcodeScannerProps) {
  const { businessId, onScan } = route.params;
  const [manualCode, setManualCode] = useState('');
  
  const handleScan = (code: string) => {
    if (onScan) {
      onScan(code);
    }
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleManualEntry = () => {
    if (manualCode.trim().length > 0) {
      handleScan(manualCode.trim());
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Mock Barcode Scanner</Text>
        <Text style={styles.subHeaderText}>
          Select a sample barcode or enter manually
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
});
