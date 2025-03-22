import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './OrderDetailsStyles';
import { ServiceItemProps } from './types';
import { generateQRCodes } from '../../../utils/orderHandlers';

const ServiceItem: React.FC<ServiceItemProps> = ({
  serviceName,
  serviceItems,
  totalQuantity,
  qrQuantities,
  setQrQuantities,
  adjustQuantities,
  setAdjustQuantities,
  setSelectedItem,
  setQrCodesToPrint,
  setShowPrintModal,
  handleAdjustQuantity,
  garments
}) => {
  // Get the current QR quantity for this service or default to total quantity
  const currentQrQuantity = qrQuantities[serviceName] !== undefined ? 
    qrQuantities[serviceName] : totalQuantity.toString();
  
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceName}>{serviceName}</Text>
        <View style={styles.serviceQuantityContainer}>
          <Text style={styles.serviceQuantity}>{totalQuantity}</Text>
          <Text style={styles.productCount}>{serviceItems.length} {serviceItems.length === 1 ? 'product type' : 'product types'}</Text>
        </View>
      </View>
      
      <View style={styles.serviceControls}>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Print: <Text style={styles.controlPreview}>({currentQrQuantity} QR codes)</Text></Text>
          <View style={styles.counterRow}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setQrQuantities(prev => ({
                ...prev,
                [serviceName]: Math.max(0, parseInt(prev[serviceName] || totalQuantity.toString()) - 1).toString()
              }))}
            >
              <Text style={styles.counterButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{currentQrQuantity}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setQrQuantities(prev => ({
                ...prev,
                [serviceName]: (parseInt(prev[serviceName] || totalQuantity.toString()) + 1).toString()
              }))}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, 
                (parseInt(currentQrQuantity) <= 0) && styles.buttonDisabled]}
              onPress={() => {
                // First, create a composite selectedItem that represents the whole service
                const serviceItem = {
                  ...serviceItems[0],
                  name: serviceName,
                  quantity: parseInt(totalQuantity.toString()) // Convert to number
                };
                
                // Set the selected item first
                setSelectedItem(serviceItem);
                
                // Generate QR codes
                const qrQuantity = parseInt(currentQrQuantity);
                if (qrQuantity > 0) {
                  // Create a custom function to generate QR codes directly
                  try {
                    const qrCodes: { qrCode: string, description: string }[] = [];
                    
                    for (let i = 0; i < qrQuantity; i++) {
                      // Generate a random QR code
                      const timestamp = Date.now();
                      const random = Math.random().toString(36).substring(2, 8);
                      const qrCode = `${serviceName}-${timestamp}-${random}-${i}`;
                      const description = `${serviceName} - Item ${i + 1} of ${qrQuantity}`;
                      
                      qrCodes.push({ qrCode, description });
                    }
                    
                    // Update state with the generated QR codes
                    setQrCodesToPrint(qrCodes as any); // Type assertion to fix type mismatch
                    setShowPrintModal(true);
                  } catch (error) {
                    console.error('Error generating QR codes:', error);
                  }
                }
              }}
              disabled={parseInt(currentQrQuantity) <= 0}
            >
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Adjust: <Text style={styles.controlPreview}>(Current total: {totalQuantity})</Text></Text>
          <View style={styles.counterRow}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => {
                const currentQuantity = parseInt(adjustQuantities[serviceName] || totalQuantity.toString());
                if (currentQuantity > 0) {
                  setAdjustQuantities(prev => ({
                    ...prev,
                    [serviceName]: (currentQuantity - 1).toString()
                  }));
                }
              }}
            >
              <Text style={styles.counterButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{adjustQuantities[serviceName] || totalQuantity.toString()}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => {
                const currentQuantity = parseInt(adjustQuantities[serviceName] || totalQuantity.toString());
                setAdjustQuantities(prev => ({
                  ...prev,
                  [serviceName]: (currentQuantity + 1).toString()
                }));
              }}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, 
                parseInt(adjustQuantities[serviceName] || totalQuantity.toString()) === totalQuantity && 
                styles.buttonDisabled]}
              onPress={() => {
                // Apply the adjustment to all items in this service group
                const newTotalQuantity = parseInt(adjustQuantities[serviceName] || totalQuantity.toString());
                if (newTotalQuantity >= 0 && newTotalQuantity !== totalQuantity) {
                  // Create an adjustment note
                  const adjustmentNote = `Service: ${serviceName} adjusted from ${totalQuantity} to ${newTotalQuantity}`;
                  
                  // Distribute the new quantity proportionally across all items in the service
                  const ratio = newTotalQuantity / totalQuantity;
                  const updatePromises = serviceItems.map(item => {
                    const newItemQuantity = Math.round(Number(item.quantity) * ratio);
                    return handleAdjustQuantity(item, newItemQuantity, adjustmentNote);
                  });
                }
              }}
              disabled={parseInt(adjustQuantities[serviceName] || totalQuantity.toString()) === totalQuantity}
            >
              <Text style={styles.actionButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.existingCount}>Processed: {serviceItems.reduce((count, item) => {
          return count + garments.filter(g => g.transactionItemID === item.id).length;
        }, 0)}</Text>
      </View>
    </View>
  );
};

export default ServiceItem; 