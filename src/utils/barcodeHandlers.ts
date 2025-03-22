import { Schema } from '../../amplify/data/resource';
import { Alert } from 'react-native';
import { checkBarcodeExists, createGarment, updateGarmentStatus, updateOrderStatus } from './orderHandlers';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

/**
 * Handler for barcode submission in PENDING status
 */
export const handlePendingBarcodeSubmit = async (
  barcodeInput: string,
  orderItems: Schema['TransactionItem']['type'][],
  garments: Schema['Garment']['type'][],
  order: Schema['Transaction']['type'] | null,
  scannedCount: number,
  totalGarments: number,
  businessId: string,
  navigation: NavigationProp<RootStackParamList>,
  onGarmentCreated: (newGarment: Schema['Garment']['type']) => void,
  onScannedCountUpdated: (newCount: number) => void,
  clearBarcodeInput: () => void,
  focusInput: () => void
) => {
  try {
    if (!barcodeInput.trim()) return;
    
    if (!orderItems || orderItems.length === 0) {
      Alert.alert('Error', 'No order items found');
      return;
    }
    
    // Check if this barcode already exists in current garments to maintain uniqueness
    const barcodeExists = garments.some(g => g.qrCode === barcodeInput.trim());
    if (barcodeExists) {
      Alert.alert('Duplicate', `Item with barcode ${barcodeInput.trim()} has already been added`);
      clearBarcodeInput();
      focusInput();
      return;
    }
    
    // Check if barcode exists in ANY order (including this one)
    const existingGarment = await checkBarcodeExists(barcodeInput.trim());
    
    if (existingGarment) {
      // Found the same barcode in the database
      // Get the description from the existing garment
      const existingDescription = existingGarment.description || 'No description';
      
      // Create a new garment with the same description
      const newGarment = await createGarment(
        orderItems[0].id,
        barcodeInput.trim(),
        existingDescription,
        'IN_PROGRESS',
        onGarmentCreated
      );

      if (!newGarment) {
        throw new Error('Failed to create garment');
      }
      
      const newScannedCount = scannedCount + 1;
      onScannedCountUpdated(newScannedCount);
      
      clearBarcodeInput();
      focusInput();
      
      // Check if all items are scanned - update order status and navigate
      if (newScannedCount >= totalGarments && totalGarments > 0 && order) {
        try {
          // Update order status to PROCESSING and add note about status change
          await updateOrderStatus(
            order.id,
            'PROCESSING',
            undefined,
            () => {
              // Skip notification and navigate directly to OrderManagement
              navigation.navigate('OrderManagement', { businessId });
            }
          );
        } catch (err) {
          console.error('Error updating order status:', err);
          Alert.alert('Error', 'Failed to update order status to PROCESSING');
        }
      }
    } else {
      // This is a completely new barcode - use a default description
      const serviceName = orderItems[0].name || 'Item';
      const defaultDescription = `${serviceName} - ${new Date().toLocaleString()}`;
      
      // Create a new garment with default description
      const newGarment = await createGarment(
        orderItems[0].id,
        barcodeInput.trim(),
        defaultDescription,
        'IN_PROGRESS',
        onGarmentCreated
      );

      if (!newGarment) {
        throw new Error('Failed to create garment');
      }
      
      const newScannedCount = scannedCount + 1;
      onScannedCountUpdated(newScannedCount);
      
      clearBarcodeInput();
      focusInput();
      
      // Check if all items are scanned - update order status and navigate
      if (newScannedCount >= totalGarments && totalGarments > 0 && order) {
        try {
          // Update order status to PROCESSING and add note about status change
          await updateOrderStatus(
            order.id,
            'PROCESSING',
            undefined,
            () => {
              // Skip notification and navigate directly to OrderManagement
              navigation.navigate('OrderManagement', { businessId });
            }
          );
        } catch (err) {
          console.error('Error updating order status:', err);
          Alert.alert('Error', 'Failed to update order status to PROCESSING');
        }
      }
    }
  } catch (error) {
    console.error('Error processing barcode:', error);
    
    // If we encounter an error, still create a garment with a default description
    try {
      const defaultDescription = `Item scanned at ${new Date().toLocaleString()}`;
      
      // Create a new garment with default description
      const newGarment = await createGarment(
        orderItems[0].id,
        barcodeInput.trim(),
        defaultDescription,
        'IN_PROGRESS',
        onGarmentCreated
      );

      if (!newGarment) {
        throw new Error('Failed to create garment');
      }
      
      const newScannedCount = scannedCount + 1;
      onScannedCountUpdated(newScannedCount);
      
      clearBarcodeInput();
      focusInput();
      
      // Check if all items are scanned - update order status and navigate
      if (newScannedCount >= totalGarments && totalGarments > 0 && order) {
        try {
          // Update order status to PROCESSING and add note about status change
          await updateOrderStatus(
            order.id,
            'PROCESSING',
            undefined,
            () => {
              // Skip notification and navigate directly to OrderManagement
              navigation.navigate('OrderManagement', { businessId });
            }
          );
        } catch (err) {
          console.error('Error updating order status:', err);
          Alert.alert('Error', 'Failed to update order status to PROCESSING');
        }
      }
    } catch (innerError) {
      console.error('Error in error handling path:', innerError);
      Alert.alert('Error', 'Failed to process barcode');
    }
  }
};

/**
 * Handler for barcode submission in PROCESSING status
 */
export const handleProcessingBarcodeSubmit = async (
  barcodeInput: string,
  garments: Schema['Garment']['type'][],
  order: Schema['Transaction']['type'] | null,
  businessId: string,
  navigation: NavigationProp<RootStackParamList>,
  onGarmentUpdated: (updatedGarment: Schema['Garment']['type']) => void,
  onCompletedGarmentsUpdated: (garmentId: string, action: 'add' | 'remove') => void,
  clearBarcodeInput: () => void,
  focusInput: () => void
) => {
  try {
    if (!barcodeInput.trim()) return;
    
    console.log('Processing mode - scanning:', barcodeInput);
    
    // Check for any matching garment regardless of status
    const anyMatchingGarment = garments.find(g => g.qrCode === barcodeInput.trim());
    
    if (!anyMatchingGarment) {
      Alert.alert('Error', `No matching garment found with ID: ${barcodeInput.trim()}`);
      clearBarcodeInput();
      focusInput();
      return;
    }
    
    // If the garment is already completed, toggle it back to IN_PROGRESS
    if (anyMatchingGarment.status === 'COMPLETED') {
      const updatedGarment = await updateGarmentStatus(
        anyMatchingGarment,
        'IN_PROGRESS',
        (updatedGarment) => {
          onGarmentUpdated(updatedGarment);
          onCompletedGarmentsUpdated(anyMatchingGarment.id, 'remove');
        }
      );
      
      if (updatedGarment) {
        clearBarcodeInput();
        focusInput();
      }
      return;
    }
    
    // If we get here, we're dealing with an unprocessed garment
    const matchingGarment = garments.find(
      g => g.qrCode === barcodeInput.trim() && g.status !== 'COMPLETED'
    );
    
    if (!matchingGarment) {
      Alert.alert('Error', `No matching unprocessed garment found with ID: ${barcodeInput.trim()}`);
      clearBarcodeInput();
      focusInput();
      return;
    }
    
    const updatedGarment = await updateGarmentStatus(
      matchingGarment,
      'COMPLETED',
      (updatedGarment) => {
        onGarmentUpdated(updatedGarment);
        onCompletedGarmentsUpdated(matchingGarment.id, 'add');
      }
    );
    
    if (updatedGarment) {
      clearBarcodeInput();
      focusInput();
      
      // Check if all garments are now completed
      const updatedGarments = [...garments];
      const garmentIndex = updatedGarments.findIndex(g => g.id === matchingGarment.id);
      if (garmentIndex >= 0) {
        updatedGarments[garmentIndex] = updatedGarment;
      }
      
      const allCompleted = updatedGarments.every(g => g.status === 'COMPLETED');
      
      if (allCompleted && order) {
        // Update order status to CLEANED
        try {
          await updateOrderStatus(
            order.id,
            'CLEANED',
            undefined,
            () => {
              // Navigate directly to OrderManagement screen without showing notification
              navigation.navigate('OrderManagement', { businessId });
            }
          );
        } catch (err) {
          console.error('Error updating order status:', err);
          Alert.alert('Error', 'Failed to update order status');
        }
      }
    }
  } catch (error) {
    console.error('Error processing barcode in PROCESSING mode:', error);
    Alert.alert('Error', 'Failed to process barcode');
  }
}; 