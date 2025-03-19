import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  TextInput,
  Share,
  Platform,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import * as ImagePicker from 'react-native-image-picker';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';
import QRCode from 'react-native-qrcode-svg';
import { QRScanner } from './components/QRScanner';

// Initialize Amplify client
const client = generateClient<Schema>();

type OrderDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'OrderDetails'>;

// Order statuses
const ORDER_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  CLEANED: 'Cleaned',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

type TemporaryGarment = {
  qrCode: string;
  description: string;
  status: string;
  transactionItemID: string;
};

export default function OrderDetails({ route }: OrderDetailsScreenProps) {
  const { orderId, businessId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [order, setOrder] = useState<Schema['Transaction']['type'] | null>(null);
  const [orderItems, setOrderItems] = useState<Schema['TransactionItem']['type'][]>([]);
  const [garments, setGarments] = useState<Schema['Garment']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Schema['TransactionItem']['type'] | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGarment, setEditingGarment] = useState<TemporaryGarment | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [totalGarments, setTotalGarments] = useState(0);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<Schema['TransactionItem']['type'] | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [qrQuantities, setQrQuantities] = useState<{[key: string]: string}>({});
  const [adjustQuantities, setAdjustQuantities] = useState<{[key: string]: string}>({});
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [qrCodesToPrint, setQrCodesToPrint] = useState<{qrCode: string, description: string}[]>([]);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    // Initialize counters when order items change
    const initialQrQuantities: {[key: string]: string} = {};
    const initialAdjustQuantities: {[key: string]: string} = {};
    
    orderItems.forEach(item => {
      initialQrQuantities[item.id] = item.quantity.toString();
      initialAdjustQuantities[item.id] = item.quantity.toString();
    });
    
    setQrQuantities(initialQrQuantities);
    setAdjustQuantities(initialAdjustQuantities);
  }, [orderItems]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch order details
      const orderResult = await client.models.Transaction.get({ id: orderId });
      
      if (orderResult.errors || !orderResult.data) {
        Alert.alert('Error', 'Failed to fetch order details');
        navigation.goBack();
        return;
      }
      
      setOrder(orderResult.data);
      
      // Fetch order items
      const orderItemsResult = await client.models.TransactionItem.list({
        filter: { transactionID: { eq: orderId } }
      });
      
      if (orderItemsResult.errors) {
        Alert.alert('Error', 'Failed to fetch order items');
      } else {
        const items = orderItemsResult.data || [];
        setOrderItems(items);
        
        // Calculate total garments
        const total = items.reduce((sum, item) => sum + Number(item.quantity), 0);
        setTotalGarments(total);
        
        // Fetch garments
        const garmentsPromises = items.map(async (item) => {
          const garmentsResult = await client.models.Garment.list({
            filter: { transactionItemID: { eq: item.id } }
          });
          return garmentsResult.data || [];
        });
        
        const garmentsResults = await Promise.all(garmentsPromises);
        const allGarments = garmentsResults.flat();
        setGarments(allGarments);
        setScannedCount(allGarments.filter(g => g.status === 'IN_PROGRESS').length);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = async () => {
    if (!barcodeInput.trim()) return;

    try {
      // Create a new garment entry for any scanned code
      const garmentResult = await client.models.Garment.create({
        transactionItemID: orderItems[0].id, // Associate with first order item
        qrCode: barcodeInput,
        description: `Scanned Item ${scannedCount + 1}`,
        status: 'IN_PROGRESS',
        lastScanned: new Date().toISOString()
      });

      if (garmentResult.errors || !garmentResult.data) {
        throw new Error('Failed to create garment');
      }

      const newGarment = garmentResult.data;
      setGarments(prevGarments => [...prevGarments, newGarment]);
      setScannedCount(prev => prev + 1);
      setBarcodeInput('');
      
      // Check if all garments are scanned
      if (scannedCount + 1 >= totalGarments) {
        // Update order status to Processing
        if (order) {
          const updateResult = await client.models.Transaction.update({
            id: order.id,
            status: ORDER_STATUSES.PROCESSING
          });

          if (updateResult.errors) {
            console.error('Error updating order status:', updateResult.errors);
          }
        }

        Alert.alert('Success', 'All garments have been scanned! Order status updated to Processing.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      Alert.alert('Error', 'Failed to process barcode');
    }
  };

  const handleSaveDescription = async () => {
    if (!currentBarcode.trim() || !description.trim() || !selectedItem) return;

    try {
      const garmentResult = await client.models.Garment.create({
        transactionItemID: selectedItem.id,
        qrCode: currentBarcode,
        description: description,
        status: 'IN_PROGRESS',
        lastScanned: new Date().toISOString()
      });

      if (garmentResult.errors || !garmentResult.data) {
        throw new Error('Failed to create garment');
      }

      const newGarment = garmentResult.data;
      setGarments(prevGarments => [...prevGarments, newGarment]);
      setScannedCount(prev => prev + 1);
      setShowDescriptionModal(false);
      setDescription('');
      setCurrentBarcode('');
      setBarcodeInput('');
    } catch (error) {
      console.error('Error saving garment:', error);
      Alert.alert('Error', 'Failed to save garment');
    }
  };

  const handleAdjustQuantity = async (item: Schema['TransactionItem']['type'], quantity: number) => {
    try {
      const updateResult = await client.models.TransactionItem.update({
        id: item.id,
        quantity: quantity
      });

      if (updateResult.errors || !updateResult.data) {
        throw new Error('Failed to update quantity');
      }

      setOrderItems(updatedItems => updatedItems.map(i => 
        i.id === item.id ? updateResult.data : i
      ).filter(item => item !== null));

      const oldQuantity = Number(item.quantity);
      const adjustment = quantity - oldQuantity;
      setTotalGarments(prev => prev + adjustment);
      setAdjustQuantities(prev => ({...prev, [item.id]: quantity.toString()}));

      // Handle notes for quantity adjustments
      if (order) {
        const currentNotes = order.customerNotes || '';
        const adjustmentNote = `\n[${new Date().toLocaleString()}] Quantity adjusted for ${item.name}: ${oldQuantity} → ${quantity} (${adjustment > 0 ? '+' : ''}${adjustment})`;
        
        // If adjusting back to original quantity, remove the previous adjustment note
        if (quantity === oldQuantity) {
          // Remove the most recent adjustment note for this item
          const notesLines = currentNotes.split('\n');
          const updatedNotes = notesLines
            .filter(line => !line.includes(`Quantity adjusted for ${item.name}: ${quantity} → ${quantity}`))
            .join('\n');
          
          const orderUpdateResult = await client.models.Transaction.update({
            id: order.id,
            customerNotes: updatedNotes
          });

          if (orderUpdateResult.errors) {
            console.error('Error updating order notes:', orderUpdateResult.errors);
          }
        } else {
          // Add new adjustment note
          const updatedNotes = currentNotes + adjustmentNote;
          const orderUpdateResult = await client.models.Transaction.update({
            id: order.id,
            customerNotes: updatedNotes
          });

          if (orderUpdateResult.errors) {
            console.error('Error updating order notes:', orderUpdateResult.errors);
          }
        }
      }
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      Alert.alert('Error', 'Failed to adjust quantity');
    }
  };

  const handleAdjustmentSubmit = async () => {
    if (!adjustingItem || !adjustmentReason.trim()) return;

    const newQuantity = Number(adjustingItem.quantity) + 1;
    try {
      const updateResult = await client.models.TransactionItem.update({
        id: adjustingItem.id,
        quantity: newQuantity
      });

      if (updateResult.errors || !updateResult.data) {
        throw new Error('Failed to update quantity');
      }

      setOrderItems(updatedItems => updatedItems.map(i => 
        i.id === adjustingItem.id ? updateResult.data : i
      ).filter(item => item !== null));

      setTotalGarments(prev => prev + 1);
      setShowAdjustModal(false);
      setAdjustingItem(null);
      setAdjustmentReason('');
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      Alert.alert('Error', 'Failed to adjust quantity');
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedItem || !qrQuantities[selectedItem.id]) return;

    const quantity = parseInt(qrQuantities[selectedItem.id]);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const newGarments: Schema['Garment']['type'][] = [];
      const qrCodes: {qrCode: string, description: string}[] = [];
      
      for (let i = 0; i < quantity; i++) {
        // Generate a random component using timestamp, random number, and base36 encoding
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const qrCode = `${selectedItem.id}-${timestamp}-${random}-${i}`;
        const description = `${selectedItem.name} - Item ${i + 1}`;
        
        // Verify the QR code doesn't already exist
        const existingGarment = garments.find(g => g.qrCode === qrCode);
        if (existingGarment) {
          // In the extremely unlikely case of a collision, retry with a new random value
          i--;
          continue;
        }
        
        const garmentResult = await client.models.Garment.create({
          transactionItemID: selectedItem.id,
          qrCode: qrCode,
          description: description,
          status: 'PENDING'
        });

        if (garmentResult.errors || !garmentResult.data) {
          throw new Error('Failed to create garment');
        }
        newGarments.push(garmentResult.data);
        qrCodes.push({ qrCode, description });
      }

      setGarments(prevGarments => [...prevGarments, ...newGarments]);
      setQrQuantities(prev => ({...prev, [selectedItem.id]: '0'}));
      setQrCodesToPrint(qrCodes);
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error generating QR codes:', error);
      Alert.alert('Error', 'Failed to generate QR codes');
    }
  };

  const handlePrint = async () => {
    try {
      // Create a text representation of the QR codes
      const printContent = qrCodesToPrint.map(({ qrCode, description }) => 
        `${description}\nQR Code: ${qrCode}\n`
      ).join('\n');

      // Share with print option
      await Share.share({
        message: printContent,
        title: `QR Codes for ${selectedItem?.name || 'Order'}`,
      });
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert('Error', 'Failed to print QR codes');
    }
  };

  const handleAdjustTotal = async () => {
    if (!selectedItem || !adjustQuantities[selectedItem.id]) return;

    const quantity = parseInt(adjustQuantities[selectedItem.id]);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const adjustment = adjustmentType === 'add' ? quantity : -quantity;
    const newQuantity = Number(selectedItem.quantity) + adjustment;
    
    if (newQuantity < 0) {
      Alert.alert('Error', 'Cannot reduce quantity below 0');
      return;
    }

    try {
      const updateResult = await client.models.TransactionItem.update({
        id: selectedItem.id,
        quantity: newQuantity
      });

      if (updateResult.errors || !updateResult.data) {
        throw new Error('Failed to update quantity');
      }

      setOrderItems(updatedItems => updatedItems.map(i => 
        i.id === selectedItem.id ? updateResult.data : i
      ).filter(item => item !== null));

      setTotalGarments(prev => prev + adjustment);
      setAdjustQuantities(prev => ({...prev, [selectedItem.id]: '0'}));
      Alert.alert('Success', `Updated quantity by ${adjustmentType === 'add' ? '+' : '-'}${quantity}`);
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      Alert.alert('Error', 'Failed to adjust quantity');
    }
  };

  const handleSaveGarment = async () => {
    if (!editingGarment || !editDescription.trim() || !selectedItem) return;

    try {
      const garmentResult = await client.models.Garment.create({
        transactionItemID: selectedItem.id,
        qrCode: editingGarment.qrCode,
        description: editDescription,
        status: 'PENDING'
      });

      if (garmentResult.errors || !garmentResult.data) {
        throw new Error('Failed to create garment');
      }

      // Update garments state
      const updatedGarments = [...garments, garmentResult.data];
      setGarments(updatedGarments);
      
      setShowEditModal(false);
      setEditDescription('');
      setEditingGarment(null);
      Alert.alert('Success', 'Garment added successfully');
    } catch (error) {
      console.error('Error saving garment:', error);
      Alert.alert('Error', 'Failed to save garment');
    }
  };

  const handleImageUpload = async (garment: Schema['Garment']['type']) => {
    try {
      const result = await ImagePicker.launchCamera({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (!result.assets || !result.assets[0].uri) {
        throw new Error('No image selected');
      }

      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to S3
      const key = `garments/${garment.id}/${Date.now()}.jpg`;
      await uploadData({
        key,
        data: blob,
        options: {
          contentType: 'image/jpeg',
        }
      });

      // Get the URL of the uploaded file
      const { url } = await getUrl({ key });

      // Update the garment with the image URL
      const updateResult = await client.models.Garment.update({
        id: garment.id,
        imageUrl: url.toString()
      });

      if (updateResult.errors) {
        throw new Error('Failed to update garment with image URL');
      }

      // Update local state
      setGarments(prevGarments => 
        prevGarments.map(g => 
          g.id === garment.id ? { ...g, imageUrl: url.toString() } : g
        )
      );

      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleDeleteImage = async (garment: Schema['Garment']['type']) => {
    if (!garment.imageUrl) return;

    try {
      // Extract the key from the URL
      const url = new URL(garment.imageUrl);
      const key = url.pathname.substring(1); // Remove leading slash

      // Delete from S3
      await remove({ key });

      // Update the garment to remove the image URL
      const updateResult = await client.models.Garment.update({
        id: garment.id,
        imageUrl: null
      });

      if (updateResult.errors) {
        throw new Error('Failed to update garment');
      }

      // Update local state
      setGarments(prevGarments => 
        prevGarments.map(g => 
          g.id === garment.id ? { ...g, imageUrl: null } : g
        )
      );

      Alert.alert('Success', 'Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('Error', 'Failed to delete image');
    }
  };

  const renderOrderItem = ({ item }: { item: Schema['TransactionItem']['type'] }) => {
    // Count existing garments for this item
    const existingGarments = garments.filter(g => g.transactionItemID === item.id).length;
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
        </View>
        
        <View style={styles.itemControls}>
          <View style={styles.qrControls}>
            <View style={styles.qrCounter}>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setQrQuantities(prev => ({
                  ...prev,
                  [item.id]: Math.max(0, parseInt(prev[item.id] || '0') - 1).toString()
                }))}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{qrQuantities[item.id] || '0'}</Text>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setQrQuantities(prev => ({
                  ...prev,
                  [item.id]: (parseInt(prev[item.id] || '0') + 1).toString()
                }))}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.printButton, !qrQuantities[item.id] && styles.buttonDisabled]}
              onPress={() => {
                setSelectedItem(item);
                handleGenerateQR();
              }}
              disabled={!qrQuantities[item.id]}
            >
              <Text style={styles.printButtonText}>Print</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.existingCount}>
            Existing: {existingGarments}
          </Text>
          <View style={styles.adjustControls}>
            <View style={styles.adjustCounter}>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => {
                  const currentQuantity = parseInt(adjustQuantities[item.id] || '0');
                  if (currentQuantity > 0) {
                    setAdjustQuantities(prev => ({
                      ...prev,
                      [item.id]: (currentQuantity - 1).toString()
                    }));
                  }
                }}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{adjustQuantities[item.id] || '0'}</Text>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => {
                  const currentQuantity = parseInt(adjustQuantities[item.id] || '0');
                  setAdjustQuantities(prev => ({
                    ...prev,
                    [item.id]: (currentQuantity + 1).toString()
                  }));
                }}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.adjustButton, adjustQuantities[item.id] === item.quantity.toString() && styles.buttonDisabled]}
              onPress={() => {
                setSelectedItem(item);
                const newQuantity = parseInt(adjustQuantities[item.id]);
                if (newQuantity >= 0 && newQuantity !== Number(item.quantity)) {
                  handleAdjustQuantity(item, newQuantity);
                }
              }}
              disabled={adjustQuantities[item.id] === item.quantity.toString()}
            >
              <Text style={styles.adjustButtonText}>Adjust</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderScannedItem = ({ item }: { item: Schema['Garment']['type'] }) => (
    <View style={styles.scannedItem}>
      <View style={styles.scannedItemContent}>
        <View style={styles.scannedItemInfo}>
          <Text style={styles.scannedItemDescription}>{item.description}</Text>
          {item.lastScanned && (
            <Text style={styles.scannedItemTime}>
              Scanned: {new Date(item.lastScanned).toLocaleString()}
            </Text>
          )}
        </View>
        <View style={styles.imageActions}>
          {item.imageUrl ? (
            <>
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.garmentImage} 
              />
              <TouchableOpacity 
                style={styles.deleteImageButton}
                onPress={() => handleDeleteImage(item)}
              >
                <Text style={styles.deleteImageButtonText}>Delete Image</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => handleImageUpload(item)}
            >
              <Text style={styles.uploadButtonText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barcode Input Section */}
      <View style={styles.barcodeSection}>
        <TextInput
          style={styles.barcodeInput}
          placeholder="Scan or enter barcode"
          value={barcodeInput}
          onChangeText={setBarcodeInput}
          onSubmitEditing={handleBarcodeSubmit}
          autoFocus
        />
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => setShowScanModal(true)}
        >
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Order Summary Section */}
      <View style={styles.summarySection}>
        <Text style={styles.orderNumber}>Order #{order.id.substring(0, 8)}</Text>
        <Text style={styles.customerName}>Customer: {order.customerID || 'N/A'}</Text>
        <Text style={styles.garmentCount}>
          Garments: {scannedCount} / {totalGarments}
        </Text>
      </View>

      {/* Order Notes Section */}
      {order.customerNotes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Order Notes</Text>
          <ScrollView style={styles.notesContainer}>
            <Text style={styles.notesText}>{order.customerNotes}</Text>
          </ScrollView>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Order Items Section */}
        <View style={styles.orderItemsSection}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <FlatList
            data={orderItems}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            style={styles.itemsList}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
          />
        </View>

        {/* Scanned Items Section */}
        <View style={styles.scannedSection}>
          <Text style={styles.sectionTitle}>Scanned Items</Text>
          <FlatList
            data={garments.filter(g => g.status === 'IN_PROGRESS')}
            renderItem={renderScannedItem}
            keyExtractor={item => item.id}
            style={styles.scannedList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No items scanned yet</Text>
            }
          />
        </View>
      </View>

      {/* Edit Garment Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Garment Details</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter garment description"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditDescription('');
                  setEditingGarment(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveGarment}
                disabled={!editDescription.trim()}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <QRScanner
              onScan={(qrCode) => {
                setBarcodeInput(qrCode);
                setShowScanModal(false);
                handleBarcodeSubmit();
              }}
              onClose={() => setShowScanModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Adjustment Modal */}
      <Modal
        visible={showAdjustModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Quantity</Text>
            <Text style={styles.modalSubtitle}>
              {adjustingItem?.name} - Current quantity: {adjustingItem?.quantity}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter reason for adjustment"
              value={adjustmentReason}
              onChangeText={setAdjustmentReason}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAdjustModal(false);
                  setAdjustingItem(null);
                  setAdjustmentReason('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAdjustmentSubmit}
                disabled={!adjustmentReason.trim()}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Description Modal */}
      <Modal
        visible={showDescriptionModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Item Description</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter garment description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDescriptionModal(false);
                  setDescription('');
                  setCurrentBarcode('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveDescription}
                disabled={!description.trim()}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Print Modal */}
      <Modal
        visible={showPrintModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QR Code Preview</Text>
            <Text style={styles.modalSubtitle}>
              {qrCodesToPrint.length} QR codes generated
            </Text>
            
            <View style={styles.qrPreviewContainer}>
              {qrCodesToPrint.slice(0, 4).map(({ qrCode, description }, index) => (
                <View key={index} style={styles.qrPreviewItem}>
                  <QRCode
                    value={qrCode}
                    size={100}
                  />
                  <Text style={styles.qrPreviewDescription}>{description}</Text>
                </View>
              ))}
              {qrCodesToPrint.length > 4 && (
                <Text style={styles.qrPreviewMore}>
                  +{qrCodesToPrint.length - 4} more...
                </Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.printButton]}
                onPress={handlePrint}
              >
                <Text style={styles.modalButtonText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPrintModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  barcodeSection: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  barcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    justifyContent: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  summarySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  garmentCount: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  orderItemsSection: {
    backgroundColor: '#fff',
  },
  scannedSection: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 8,
    backgroundColor: '#f8f9fa',
  },
  itemsList: {
    backgroundColor: '#fff',
  },
  scannedList: {
    backgroundColor: '#fff',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 4,
    marginHorizontal: 2,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '49%',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemControls: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  qrControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  counterButton: {
    backgroundColor: '#f0f0f0',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  counterButtonText: {
    fontSize: 18,
    color: '#333',
  },
  counterValue: {
    fontSize: 16,
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  printButton: {
    backgroundColor: '#4CAF50',
  },
  printButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  adjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adjustButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
    marginLeft: 8,
  },
  adjustButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  scannedItem: {
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scannedItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannedItemInfo: {
    flex: 1,
  },
  imageActions: {
    marginLeft: 8,
    alignItems: 'center',
  },
  garmentImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginBottom: 4,
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteImageButton: {
    backgroundColor: '#f44336',
    padding: 4,
    borderRadius: 4,
  },
  deleteImageButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  scannedItemDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  scannedItemTime: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 8,
    fontSize: 14,
  },
  qrPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  qrPreviewItem: {
    alignItems: 'center',
    margin: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qrPreviewDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 100,
  },
  qrPreviewMore: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  notesSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  notesContainer: {
    maxHeight: 150,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  existingCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});
