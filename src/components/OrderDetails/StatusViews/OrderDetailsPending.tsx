import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import styles from '../Common/OrderDetailsStyles';
import { OrderDetailsPendingProps } from '../Common/types';
import ServiceItem from '../Common/ServiceItem';
import ScannedItemList from '../Common/ScannedItemList';

const OrderDetailsPending: React.FC<OrderDetailsPendingProps> = ({
  order,
  orderItems,
  garments,
  scannedCount,
  totalGarments,
  serviceCategories,
  qrQuantities,
  setQrQuantities,
  adjustQuantities,
  setAdjustQuantities,
  barcodeInput,
  setBarcodeInput,
  barcodeInputRef,
  handleBarcodeSubmit,
  setShowScanModal,
  setSelectedItem,
  setQrCodesToPrint,
  setShowPrintModal,
  handleAdjustQuantity,
  navigation,
  businessId,
  handleEditGarment,
  handleDeleteGarment
}) => {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={[styles.container, { height: '50%' }]} 
        contentContainerStyle={styles.contentContainer}
      >
        {/* Barcode Input Section */}
        <View style={styles.barcodeSection}>
          <TextInput
            ref={barcodeInputRef}
            style={styles.barcodeInput}
            placeholder="Scan or enter barcode"
            value={barcodeInput}
            onChangeText={setBarcodeInput}
            onSubmitEditing={() => handleBarcodeSubmit(barcodeInput)}
            autoFocus
          />
          
          <View style={styles.scanRowContainer}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Scanned: {scannedCount} / {totalGarments}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(scannedCount / totalGarments) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={() => setShowScanModal(true)}
            >
              <FontAwesome name="camera" size={16} color="white" />
              <Text style={styles.scanButtonText}>Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary Section */}
        {order && (
          <View style={styles.orderInfoContainer}>
            <View style={styles.orderInfoHeader}>
              <Text style={styles.orderInfoTitle}>Order Details</Text>
              <View style={[styles.statusChip, styles.pendingStatus]}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
            
            <Text style={styles.title}>Order #{order.id.substring(0, 8)}</Text>
            
            <View style={styles.orderInfo}>
              <Text style={styles.customerName}>{order.firstName} {order.lastName}</Text>
              <Text>
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.notesSection}>
              <Text style={styles.noteLabel}>Customer Notes</Text>
              <Text style={styles.noteText}>{order.customerNotes}</Text>
            </View>
          </View>
        )}

        {/* Services Section */}
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.servicesContainer}>
          {Object.entries(serviceCategories).map(([serviceName, serviceItems]) => {
            const totalQuantity = (serviceItems as any[]).reduce((sum, item) => sum + Number(item.quantity), 0);
            return (
              <ServiceItem 
                key={serviceName}
                serviceName={serviceName}
                serviceItems={serviceItems}
                totalQuantity={totalQuantity}
                qrQuantities={qrQuantities}
                setQrQuantities={setQrQuantities}
                adjustQuantities={adjustQuantities}
                setAdjustQuantities={setAdjustQuantities}
                setSelectedItem={setSelectedItem}
                setQrCodesToPrint={setQrCodesToPrint}
                setShowPrintModal={setShowPrintModal}
                handleAdjustQuantity={handleAdjustQuantity}
                garments={garments}
              />
            );
          })}
        </View>
      </ScrollView>
      
      {/* Scanned Items Section - Fixed at bottom 50% of screen */}
      <View style={styles.scannedItemsContainer}>
        <ScannedItemList 
          garments={garments}
          onEditGarment={handleEditGarment}
          onDeleteGarment={handleDeleteGarment}
        />
      </View>
    </View>
  );
};

export default OrderDetailsPending;