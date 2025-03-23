import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Button
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const [customer, setCustomer] = useState<Schema['Customer']['type'] | null>(null);
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [qrCodesToPrint, setQrCodesToPrint] = useState<{qrCode: string, description: string}[]>([]);
  const [removedGarments, setRemovedGarments] = useState<string[]>([]);
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  
  // Reference to the barcode input field for auto-focusing
  const barcodeInputRef = useRef<TextInput>(null);
  const [processingMode, setProcessingMode] = useState(false);
  const [completedGarments, setCompletedGarments] = useState<string[]>([]);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    if (order?.status === 'PROCESSING') {
      setProcessingMode(true);
    } else {
      setProcessingMode(false);
    }
    
    // We're removing the automatic redirection to RackAssignment so users
    // can handle the order as needed without forced navigation
  }, [order]);

  // Group order items by service type - simple approach
  const groupedOrderItems = React.useMemo(() => {
    // Create a map to store services and their items
    const serviceMap: { [key: string]: Schema['TransactionItem']['type'][] } = {};
    
    // Group all items by their name
    // This is the simplest approach that will work with any data structure
    orderItems.forEach(item => {
      const name = item.name || 'Unknown';
      
      if (!serviceMap[name]) {
        serviceMap[name] = [];
      }
      
      serviceMap[name].push(item);
    });
    
    return serviceMap;
  }, [orderItems]);
  
  // State to store services from the database
  const [services, setServices] = React.useState<Schema['Service']['type'][]>([]);
  
  // Fetch services from the database
  React.useEffect(() => {
    const fetchServices = async () => {
      try {
        // Get business ID from the order
        const businessID = order?.businessID;
        if (!businessID) return;
        
        // Fetch services for this business
        const servicesResult = await client.models.Service.list({
          filter: { businessID: { eq: businessID } }
        });
        
        if (servicesResult.data) {
          setServices(servicesResult.data);
          console.log('Fetched services:', servicesResult.data.map(s => s.name));
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    
    fetchServices();
  }, [order]);
  
  // Create service categories based on the services in the database
  const serviceCategories = React.useMemo(() => {
    // Create a map to store services and their items
    const result: { [key: string]: Schema['TransactionItem']['type'][] } = {};
    
    // If we have services from the database, use those
    if (services.length > 0) {
      // Initialize each service category with an empty array
      services.forEach(service => {
        if (service.name) {
          result[service.name] = [];
        }
      });
      
      // Add 'Other Services' category
      result['Other Services'] = [];
      
      // Distribute order items to the appropriate service category
      orderItems.forEach(item => {
        // Try to find a matching service by ID first
        if ((item as any).serviceID) {
          const matchingService = services.find(s => s.id === (item as any).serviceID);
          if (matchingService && matchingService.name) {
            result[matchingService.name].push(item);
            return;
          }
        }
        
        // Then try to match by serviceType
        if ((item as any).serviceType) {
          const serviceType = (item as any).serviceType;
          const matchingService = services.find(s => s.name === serviceType);
          if (matchingService && matchingService.name) {
            result[matchingService.name].push(item);
            return;
          }
        }
        
        // Finally, try to match by name
        let matched = false;
        for (const service of services) {
          if (service.name && item.name && item.name.includes(service.name)) {
            result[service.name].push(item);
            matched = true;
            break;
          }
        }
        
        // If no match was found, add to 'Other Services'
        if (!matched) {
          result['Other Services'].push(item);
        }
      });
    } else {
      // If we don't have services from the database, use the order items
      // Group by serviceType or name
      orderItems.forEach(item => {
        const key = (item as any).serviceType || item.name || 'Other Services';
        
        if (!result[key]) {
          result[key] = [];
        }
        
        result[key].push(item);
      });
    }
    
    // Remove empty categories
    Object.keys(result).forEach(key => {
      if (result[key].length === 0) {
        delete result[key];
      }
    });
    
    return result;
  }, [orderItems, services]);
  
  // For displaying order items, we'll use the original groupedOrderItems
  // But we'll modify the renderServiceItem function to only show service categories
  
  // We'll use the original groupedOrderItems directly
  // No need for additional filtering
  
  // Calculate total quantities for each service
  const serviceTotals = React.useMemo(() => {
    const totals: { [key: string]: number } = {};
    
    Object.entries(groupedOrderItems).forEach(([serviceName, items]) => {
      totals[serviceName] = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    });
    
    return totals;
  }, [groupedOrderItems]);
  
  useEffect(() => {
    // Initialize counters when order items change
    const initialQrQuantities: {[key: string]: string} = {};
    const initialAdjustQuantities: {[key: string]: string} = {};
    
    // Use service names as keys instead of individual item IDs
    Object.entries(serviceTotals).forEach(([serviceName, total]) => {
      initialQrQuantities[serviceName] = total.toString();
      initialAdjustQuantities[serviceName] = total.toString();
    });
    
    setQrQuantities(initialQrQuantities);
    setAdjustQuantities(initialAdjustQuantities);
  }, [serviceTotals]);

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
      
      // Fetch customer information if customerID exists
      if (orderResult.data.customerID) {
        try {
          const customerResult = await client.models.Customer.get({ id: orderResult.data.customerID });
          if (customerResult.data) {
            setCustomer(customerResult.data);
          }
        } catch (error) {
          console.error('Error fetching customer details:', error);
        }
      }
      
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
    
    if (processingMode && order?.status === 'PROCESSING') {
      // Processing mode logic - fix scanning by improving the garment matching
      console.log('Processing mode - scanning:', barcodeInput);
      console.log('Available garments:', garments.map(g => ({ id: g.id, qrCode: g.qrCode, status: g.status })));
      
      // Check for any matching garment regardless of status
      const anyMatchingGarment = garments.find(g => g.qrCode === barcodeInput.trim());
      
      if (!anyMatchingGarment) {
        Alert.alert('Error', `No matching garment found with ID: ${barcodeInput.trim()}`);
        setBarcodeInput('');
        // Focus back on input field
        barcodeInputRef.current?.focus();
        return;
      }
      
      // If the garment is already completed, toggle it back to IN_PROGRESS
      if (anyMatchingGarment.status === 'COMPLETED') {
        try {
          const updateResult = await client.models.Garment.update({
            id: anyMatchingGarment.id,
            status: 'IN_PROGRESS',
            lastScanned: new Date().toISOString()
          });
          
          if (updateResult.data) {
            // Remove from completed garments
            setCompletedGarments(prev => prev.filter(id => id !== anyMatchingGarment.id));
            
            // Update local state
            setGarments(prevGarments => 
              prevGarments.map(g => g.id === anyMatchingGarment.id ? updateResult.data! : g)
            );
            
            setBarcodeInput('');
            // Focus back on input field
            barcodeInputRef.current?.focus();
          }
          return;
        } catch (err) {
          console.error('Error updating garment status:', err);
          Alert.alert('Error', 'Failed to update garment status');
          return;
        }
      }
      
      // If we get here, we're dealing with an unprocessed garment
      const matchingGarment = garments.find(
        g => g.qrCode === barcodeInput.trim() && g.status !== 'COMPLETED'
      );
      
      if (!matchingGarment) {
        Alert.alert('Error', `No matching unprocessed garment found with ID: ${barcodeInput.trim()}`);
        setBarcodeInput('');
        // Focus back on input field
        barcodeInputRef.current?.focus();
        return;
      }
      
      try {
        const updateResult = await client.models.Garment.update({
          id: matchingGarment.id,
          status: 'COMPLETED',
          lastScanned: new Date().toISOString()
        });
        
        if (updateResult.data) {
          // Add to completed garments
          setCompletedGarments(prev => [...prev, matchingGarment.id]);
          
          // Update local state
          setGarments(prevGarments => 
            prevGarments.map(g => g.id === matchingGarment.id ? updateResult.data! : g)
          );
          
          setBarcodeInput('');
          // Focus back on input field
          barcodeInputRef.current?.focus();
          
          // Check if all garments are now completed
          const updatedGarments = [...garments];
          const garmentIndex = updatedGarments.findIndex(g => g.id === matchingGarment.id);
          if (garmentIndex >= 0 && updateResult.data) {
            updatedGarments[garmentIndex] = updateResult.data;
          }
          
          const allCompleted = updatedGarments.every(g => g.status === 'COMPLETED');
          
          if (allCompleted && order) {
            // Update order status to CLEANED
            try {
              await client.models.Transaction.update({
                id: order.id,
                status: 'CLEANED',
                customerNotes: `${order.customerNotes || ''}\n[${new Date().toLocaleString()}] Status changed: PROCESSING → CLEANED`
              });
              
              // Navigate directly to OrderManagement screen without showing notification
              navigation.navigate('OrderManagement', { 
                businessId: businessId 
              });
            } catch (err) {
              console.error('Error updating order status:', err);
              Alert.alert('Error', 'Failed to update order status');
            }
          } else {
            // Garment processed successfully, but not all garments are completed yet
            // No notification shown as requested
          }
        }
      } catch (err) {
        console.error('Error updating garment status:', err);
        Alert.alert('Error', 'Failed to update garment status');
      }
    } else {
      // Original barcode handling for non-processing mode
      try {
        if (!orderItems || orderItems.length === 0) {
          Alert.alert('Error', 'No order items found');
          return;
        }
        
        // Check if this barcode already exists to maintain uniqueness
        const barcodeExists = garments.some(g => g.qrCode === barcodeInput.trim());
        if (barcodeExists) {
          Alert.alert('Duplicate', `Item with barcode ${barcodeInput.trim()} has already been added`);
          setBarcodeInput('');
          // Focus back on input field
          barcodeInputRef.current?.focus();
          // Focus back on input field
          barcodeInputRef.current?.focus();
          return;
        }
        
        // Check if barcode exists in ANY order (including this one)
        try {
          const existingGarmentsResult = await client.models.Garment.list({
            filter: { qrCode: { eq: barcodeInput.trim() } }
          });
          
          if (existingGarmentsResult.data && existingGarmentsResult.data.length > 0) {
            // Found the same barcode in the database
            const existingGarment = existingGarmentsResult.data[0];
            
            // Check if this garment belongs to the current order
            const existingOrderResult = await client.models.TransactionItem.get({
              id: existingGarment.transactionItemID
            });
            
            if (existingOrderResult.data) {
              // If the garment belongs to the current order, reuse it without showing the modal
              if (existingOrderResult.data.transactionID === orderId) {
                // This is a previously saved item for this order - reuse it without showing modal
                // Create a new garment with the same description
                const garmentResult = await client.models.Garment.create({
                  transactionItemID: orderItems[0].id,
                  qrCode: barcodeInput.trim(),
                  description: existingGarment.description || 'No description',
                  status: 'IN_PROGRESS',
                  lastScanned: new Date().toISOString(),
                  type: existingGarment.type || 'CLOTHING' // Add required type field
                });

                if (garmentResult.errors || !garmentResult.data) {
                  throw new Error('Failed to create garment');
                }

                const newGarment = garmentResult.data;
                setGarments(prevGarments => [...prevGarments, newGarment]);
                
                const newScannedCount = scannedCount + 1;
                setScannedCount(newScannedCount);
                
                setBarcodeInput('');
                // Focus back on input field
                barcodeInputRef.current?.focus();
                
                // Check if all items are scanned - update order status and navigate
                if (newScannedCount >= totalGarments && totalGarments > 0 && order) {
                  try {
                    // Update order status to PROCESSING and add note about status change
                    await client.models.Transaction.update({
                      id: order.id,
                      status: 'PROCESSING',
                      customerNotes: `${order.customerNotes || ''}\n[${new Date().toLocaleString()}] Status changed: PENDING → PROCESSING`
                    });
                    
                    // Skip notification and navigate directly to OrderManagement
                    navigation.navigate('OrderManagement', { businessId });
                  } catch (err) {
                    console.error('Error updating order status:', err);
                    Alert.alert('Error', 'Failed to update order status to PROCESSING');
                  }
                }
                return;
              } else {
                // The garment belongs to a different order - show warning
                const orderInfoResult = await client.models.Transaction.get({
                  id: existingOrderResult.data.transactionID
                });
                
                let orderInfo = "";
                if (orderInfoResult.data) {
                  const orderId = orderInfoResult.data.id.substring(0, 8);
                  const customerName = orderInfoResult.data.customerID || 'Unknown';
                  orderInfo = `Order #${orderId} (Customer: ${customerName})`;
                }
                
                Alert.alert(
                  'Barcode Already Used',
                  `This barcode has already been scanned for ${orderInfo}. Do you still want to use it?`,
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                      onPress: () => setBarcodeInput('')
                    },
                    {
                      text: 'Use Anyway',
                      onPress: () => {
                        // Create a new garment for this order
                        setBarcodeInput('');
                        setSelectedItem(orderItems[0]);
                        Alert.alert('Item Added', 'The item has been added to this order.');
                      }
                    }
                  ]
                );
                return;
              }
            }
          }
        } catch (error) {
          console.error('Error checking barcode uniqueness:', error);
          // Continue with normal flow if there's an error checking
        }
        
        // Automatically create garment without showing description modal
        try {
          const garmentResult = await client.models.Garment.create({
            transactionItemID: orderItems[0].id,
            qrCode: barcodeInput.trim(),
            description: 'Garment ' + barcodeInput.trim(), // Auto-generate a basic description
            status: 'IN_PROGRESS',
            lastScanned: new Date().toISOString(),
            type: 'CLOTHING'
          });

          if (garmentResult.errors || !garmentResult.data) {
            throw new Error('Failed to create garment');
          }

          const newGarment = garmentResult.data;
          setGarments(prevGarments => [...prevGarments, newGarment]);
          
          const newScannedCount = scannedCount + 1;
          setScannedCount(newScannedCount);
          
          setBarcodeInput('');
          // Focus back on input field
          barcodeInputRef.current?.focus();
          
          // Check if all items are scanned - update order status and navigate
          if (newScannedCount >= totalGarments && totalGarments > 0 && order) {
            try {
              // Update order status to PROCESSING and add note about status change
              await client.models.Transaction.update({
                id: order.id,
                status: 'PROCESSING',
                customerNotes: `${order.customerNotes || ''}\n[${new Date().toLocaleString()}] Status changed: PENDING → PROCESSING`
              });
              
              // Skip notification and navigate directly to OrderManagement
              navigation.navigate('OrderManagement', { businessId });
            } catch (err) {
              console.error('Error updating order status:', err);
              Alert.alert('Error', 'Failed to update order status to PROCESSING');
            }
          }
        } catch (error) {
          console.error('Error creating garment:', error);
          Alert.alert('Error', 'Failed to create garment');
        }
        
      } catch (error) {
        console.error('Error processing barcode:', error);
        Alert.alert('Error', 'Failed to process barcode');
      }
    }
  };

  // Description modal and handleSaveDescription function removed

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
          status: 'PENDING',
          type: 'CLOTHING' // Add required type field
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
        status: 'PENDING',
        type: 'CLOTHING' // Add required type field
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

  const renderServiceItem = ({ item }: { item: [string, Schema['TransactionItem']['type'][]] }) => {
    const [serviceName, serviceItems] = item;
    
    // Calculate the total quantity for this service
    const totalQuantity = serviceItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    
    // Count the number of unique products in this service
    const productCount = serviceItems.length;
    
    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          <View style={styles.serviceQuantityContainer}>
            <Text style={styles.serviceQuantity}>{totalQuantity}</Text>
            <Text style={styles.productCount}>{productCount} {productCount === 1 ? 'product type' : 'product types'}</Text>
          </View>
        </View>
        
        <View style={styles.serviceControls}>
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Print: <Text style={styles.controlPreview}>({totalQuantity})</Text></Text>
            <View style={styles.counterRow}>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setQrQuantities(prev => {
                  const currentValue = prev[serviceName] !== undefined ? parseInt(prev[serviceName]) : totalQuantity;
                  return {
                    ...prev,
                    [serviceName]: Math.max(0, currentValue - 1).toString()
                  };
                })}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{qrQuantities[serviceName] !== undefined ? qrQuantities[serviceName] : totalQuantity.toString()}</Text>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setQrQuantities(prev => {
                  const currentValue = prev[serviceName] !== undefined ? parseInt(prev[serviceName]) : totalQuantity;
                  return {
                    ...prev,
                    [serviceName]: (currentValue + 1).toString()
                  };
                })}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  // Use the first item in the service group as the selected item
                  setSelectedItem(serviceItems[0]);
                  // If no custom quantity is set, use the total quantity
                  if (qrQuantities[serviceName] === undefined) {
                    setQrQuantities(prev => ({
                      ...prev,
                      [serviceName]: totalQuantity.toString()
                    }));
                  }
                  handleGenerateQR();
                }}
              >
                <Text style={styles.actionButtonText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Adjust: <Text style={styles.controlPreview}>({totalQuantity})</Text></Text>
            <View style={styles.counterRow}>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => {
                  const currentValue = adjustQuantities[serviceName] !== undefined ? parseInt(adjustQuantities[serviceName]) : totalQuantity;
                  if (currentValue > 0) {
                    setAdjustQuantities(prev => ({
                      ...prev,
                      [serviceName]: (currentValue - 1).toString()
                    }));
                  }
                }}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{adjustQuantities[serviceName] !== undefined ? adjustQuantities[serviceName] : totalQuantity.toString()}</Text>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => {
                  const currentValue = adjustQuantities[serviceName] !== undefined ? parseInt(adjustQuantities[serviceName]) : totalQuantity;
                  setAdjustQuantities(prev => ({
                    ...prev,
                    [serviceName]: (currentValue + 1).toString()
                  }));
                }}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, (adjustQuantities[serviceName] === undefined || parseInt(adjustQuantities[serviceName]) === totalQuantity) && styles.buttonDisabled]}
                onPress={() => {
                  // Apply the adjustment to all items in this service group
                  const newTotalQuantity = adjustQuantities[serviceName] !== undefined ? parseInt(adjustQuantities[serviceName]) : totalQuantity;
                  if (newTotalQuantity >= 0 && newTotalQuantity !== totalQuantity) {
                    // Distribute the new quantity proportionally across all items in the service
                    const ratio = newTotalQuantity / totalQuantity;
                    serviceItems.forEach(item => {
                      const newItemQuantity = Math.round(Number(item.quantity) * ratio);
                      handleAdjustQuantity(item, newItemQuantity);
                    });
                  }
                }}
                disabled={adjustQuantities[serviceName] === undefined || parseInt(adjustQuantities[serviceName]) === totalQuantity}
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

  const renderOrderItem = ({ item }: { item: Schema['Garment']['type'] }) => {
    // Check if the item has been scanned (status is IN_PROGRESS)
    const isScanned = item.status === 'IN_PROGRESS';
    // Check if the item has been removed
    const isRemoved = removedGarments.includes(item.id);
    
    // Don't render removed items
    if (isRemoved) return null;
    
    return (
      <View style={[styles.orderItem, isScanned && styles.scannedOrderItem]}>
        <View style={styles.orderItemContent}>
          <View style={styles.orderItemInfo}>
            <View style={styles.orderItemHeader}>
              <Text style={styles.orderItemDescription}>{item.description}</Text>
              <TouchableOpacity 
                style={styles.removeItemButton}
                onPress={() => {
                  // Add to removed garments list
                  setRemovedGarments(prev => [...prev, item.id]);
                }}
              >
                <Text style={styles.removeItemButtonText}>X</Text>
              </TouchableOpacity>
            </View>
            
            {item.lastScanned && (
              <Text style={styles.orderItemTime}>
                {isScanned ? 'Scanned' : 'Created'}: {new Date(item.lastScanned).toLocaleString()}
              </Text>
            )}
            
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={item.qrCode}
                size={80}
                backgroundColor="white"
                color="black"
              />
              <Text style={styles.qrCodeText}>{item.qrCode}</Text>
            </View>
            
            <View style={styles.itemActionButtons}>
              <TouchableOpacity 
                style={styles.editDescriptionButton}
                onPress={() => {
                  setEditingGarment(item);
                  setEditDescription(item.description || '');
                  setShowEditModal(true);
                }}
              >
                <Text style={styles.editDescriptionButtonText}>Edit Description</Text>
              </TouchableOpacity>
              
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
      </View>
    );
  };

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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Order Details</Text>
          {order && (
            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoText}>Order #{order.orderNumber || order.id.substring(0, 8)}</Text>
              <Text style={styles.orderInfoText}>{customer ? `${customer.firstName} ${customer.lastName}` : ''}</Text>
              <Text style={styles.orderInfoText}>{scannedCount}/{totalGarments} items</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {order?.status === 'CLEANED' && (
            <TouchableOpacity 
              style={styles.rackButtonHeader}
              onPress={() => navigation.navigate('RackAssignment', {
                orderId: orderId,
                businessId: businessId
              })}
            >
              <Text style={styles.rackButtonText}>Assign to Rack</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.dashboardButton}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'Dashboard', params: { businessId } }],
            })}
          >
            <Text style={styles.dashboardButtonText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {processingMode ? (
        <>
          <Text style={styles.sectionTitle}>Process Garments</Text>
          <Text>Scan each garment to mark it as processed</Text>
          <Text>Completed: {completedGarments.length} / {garments.length}</Text>
          
          <View style={styles.barcodeContainer}>
            <TextInput
              ref={barcodeInputRef}
              style={styles.input}
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              placeholder="Scan or enter garment ID"
              keyboardType="default"
              autoCapitalize="none"
              onSubmitEditing={handleBarcodeSubmit}
              autoFocus
            />
            <Button title="Process" onPress={handleBarcodeSubmit} />
          </View>
          
          <FlatList
            data={garments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[
                styles.garmentItem, 
                item.status === 'COMPLETED' ? styles.completedItem : {}
              ]}>
                <Text>Garment ID: {item.qrCode}</Text>
                <Text>Description: {item.description}</Text>
                <Text>Status: {item.status}</Text>
              </View>
            )}
          />
        </>
      ) : (
        <>
          {/* Barcode Input Section */}
          <View style={styles.barcodeSection}>
            <TextInput
              ref={barcodeInputRef}
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
          
          {/* Rack Assignment Button for CLEANED orders */}
          {order?.status === 'CLEANED' && (
            <TouchableOpacity 
              style={styles.rackButton}
              onPress={() => navigation.navigate('RackAssignment', {
                orderId: orderId,
                businessId: businessId
              })}
            >
              <Text style={styles.rackButtonText}>Assign to Rack</Text>
            </TouchableOpacity>
          )}

          {/* Order Notes Section */}
          {order?.customerNotes && (
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity 
                    style={[styles.printAllButton, {backgroundColor: '#FF9800'}]}
                    onPress={() => setRemovedItems([])}
                  >
                    <Text style={styles.printAllButtonText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.printAllButton}
                    onPress={() => {
                    // Get all non-removed garments and non-removed items
                    const garmentsToPrint = garments.filter(g => !removedGarments.includes(g.id));
                    
                    // Get all items that haven't been removed via the X button
                    const itemsToPrint = orderItems.flatMap(item => {
                      const quantity = parseInt(item.quantity.toString()) || 1;
                      const individualItems = [];
                      
                      for (let i = 0; i < quantity; i++) {
                        const uniqueId = `${item.id}-${i}`;
                        if (!removedItems.includes(uniqueId)) {
                          individualItems.push({
                            qrCode: uniqueId,
                            description: item.name || 'No description'
                          });
                        }
                      }
                      
                      return individualItems;
                    });
                    
                    // Combine both garments and items
                    const allQrCodes = [
                      ...garmentsToPrint.map(g => ({
                        qrCode: g.qrCode,
                        description: g.description || 'No description'
                      })),
                      ...itemsToPrint
                    ];
                    
                    if (allQrCodes.length === 0) {
                      Alert.alert('No Items', 'There are no items to print');
                      return;
                    }
                    
                    setQrCodesToPrint(allQrCodes);
                    setShowPrintModal(true);
                  }}
                >
                  <Text style={styles.printAllButtonText}>
                    Print ({orderItems.reduce((total, item) => {
                      const quantity = parseInt(item.quantity.toString()) || 1;
                      let count = 0;
                      for (let i = 0; i < quantity; i++) {
                        const uniqueId = `${item.id}-${i}`;
                        if (!removedItems.includes(uniqueId)) {
                          count++;
                        }
                      }
                      return total + count;
                    }, 0)})
                  </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Display each product individually with color-coded service types */}
              <FlatList
                data={(() => {
                  // Define service colors - first 4 service types get predefined colors
                  const predefinedColors = ['#FF0000', '#0000FF', '#FFA500', '#008000']; // Red, Blue, Orange, Green
                  
                  // Create a mapping of service types to colors
                  const serviceColorMap: Record<string, string> = {};
                  
                  // First, collect all unique service IDs
                  const uniqueServiceIDs: string[] = [];
                  
                  orderItems.forEach(item => {
                    const serviceID = item.serviceID || '';
                    if (serviceID && !uniqueServiceIDs.includes(serviceID)) {
                      uniqueServiceIDs.push(serviceID);
                    }
                  });
                  
                  // Assign colors to service IDs
                  uniqueServiceIDs.forEach((serviceID, index) => {
                    if (index < predefinedColors.length) {
                      // Use predefined colors for the first few service types
                      serviceColorMap[serviceID] = predefinedColors[index];
                    } else {
                      // Generate a consistent color for additional service types
                      let hash = 0;
                      for (let i = 0; i < serviceID.length; i++) {
                        hash = serviceID.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      const h = Math.abs(hash) % 360;
                      const s = 65 + (Math.abs(hash) % 20);
                      const l = 45 + (Math.abs(hash) % 10);
                      serviceColorMap[serviceID] = `hsl(${h}, ${s}%, ${l}%)`;
                    }
                  });
                  
                  // Create individual items with their service colors
                  const items = [];
                  for (const item of orderItems) {
                    const serviceID = item.serviceID || '';
                    const color = serviceColorMap[serviceID] || '#999999';
                    const quantity = parseInt(item.quantity.toString()) || 1;
                    
                    // Create individual items for each quantity
                    for (let i = 0; i < quantity; i++) {
                      const uniqueId = `${item.id}-${i}`;
                      // Only add items that haven't been removed
                      if (!removedItems.includes(uniqueId)) {
                        items.push({
                          ...item,
                          uniqueId: uniqueId,
                          quantity: 1,
                          serviceColor: color
                        });
                      }
                    }
                  }
                  
                  return items;
                })()}
                horizontal={false}
                numColumns={1}
                renderItem={({ item }) => {
                  // Use the pre-assigned color for this item
                  const color = (item as any).serviceColor || '#999999';
                  console.log('DEBUG - Rendering item:', item.name, 'Color:', color);
                  
                  // Generate a unique QR code for each item
                  const qrValue = (item as any).uniqueId || item.id;
                  
                  const uniqueId = (item as any).uniqueId || `${item.id}-0`;
                  
                  return (
                    <View style={[styles.orderItemCard, { 
                      borderColor: color, 
                      borderWidth: 3
                    }]}>
                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={() => {
                          // Add to the removed items list
                          setRemovedItems([...removedItems, uniqueId]);
                        }}
                      >
                        <Text style={styles.removeItemButtonText}>✕</Text>
                      </TouchableOpacity>
                      <View style={[styles.orderItemColorBar, { backgroundColor: color }]} />
                      <View style={styles.orderItemContentWrapper}>
                        <Text style={[styles.orderItemName, { color }]}>{item.name}</Text>
                        <Text style={[styles.orderItemPrice, { color }]}>${item.price.toFixed(2)}</Text>
                        <View style={styles.itemQrCodeContainer}>
                          <QRCode
                            value={qrValue}
                            size={80}
                            backgroundColor="white"
                            color="black"
                          />
                        </View>
                      </View>
                    </View>
                  );
                }}
                keyExtractor={item => item.uniqueId || item.id}
                style={styles.orderItemsList}
                contentContainerStyle={styles.orderItemsContainer}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Loading order items...</Text>
                }
              />
            </View>
          </View>
        </>
      )}

      {/* Description Modal removed */}

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
                
                // Check if this is an existing QR code that was previously removed
                const existingGarment = garments.find(g => g.qrCode === qrCode);
                if (existingGarment && removedGarments.includes(existingGarment.id)) {
                  // Remove from the removed list to add it back
                  setRemovedGarments(prev => prev.filter(id => id !== existingGarment.id));
                  
                  // If it's not already scanned, mark it as scanned
                  if (existingGarment.status !== 'IN_PROGRESS') {
                    handleBarcodeSubmit();
                  } else {
                    Alert.alert('Success', 'Item added back to the order list');
                  }
                } else {
                  // Process as normal
                  handleBarcodeSubmit();
                }
              }}
              onClose={() => setShowScanModal(false)}
            />
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
          <View style={[styles.modalContent, styles.printModalContent]}>
            <Text style={styles.modalTitle}>QR Codes Ready to Print ({qrCodesToPrint.length})</Text>
            
            <FlatList
              data={qrCodesToPrint}
              keyExtractor={(_, index) => `qr-code-${index}`}
              renderItem={({ item }) => (
                <View style={styles.qrPreviewItem}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={item.qrCode}
                      size={120}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                  <Text style={styles.qrDescription}>{item.description}</Text>
                  <Text style={styles.qrCodeText}>{item.qrCode}</Text>
                </View>
              )}
              style={styles.qrPreviewContainer}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No QR codes to display</Text>}
            />
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.printModalButton, styles.cancelButton]}
                onPress={() => setShowPrintModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
          
              <TouchableOpacity 
                style={[styles.printModalButton, styles.printButton]}
                disabled={qrCodesToPrint.length === 0}
                onPress={async () => {
                  // Printing logic would go here
                  Alert.alert('Print', `Printing ${qrCodesToPrint.length} QR codes`);
                  setShowPrintModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Print ({qrCodesToPrint.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create<any>({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  editDescriptionButton: {
    backgroundColor: '#4CAF50',
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editDescriptionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dashboardButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  orderItemsList: {
    flex: 1,
  },
  orderItemsContainer: {
    padding: 8,
  },
  orderItemCard: {
    width: 406,
    height: 203,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  orderItemColorBar: {
    height: 10,
    width: '100%',
  },
  orderItemContentWrapper: {
    padding: 12,
    alignItems: 'center',
  },
  removeItemButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  removeItemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  orderItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  itemQrCodeContainer: {
    marginTop: 8,
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemServiceType: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  printAllButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  printAllButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  barcodeContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  garmentItem: {
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  completedItem: {
    backgroundColor: '#e6ffe6',
    opacity: 0.7
  },
  itemsList: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    flexGrow: 0,
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 8,
    fontSize: 14,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
  },
  cancelButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scannedOrderItem: {
    backgroundColor: '#e8f5e9', // Light green background for scanned items
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  orderItemContent: {
    flexDirection: 'column',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  orderItemTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },

  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  qrCodeText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  itemActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  scannedInfo: {
    flex: 1,
  },
  scannedId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scannedDesc: {
    fontSize: 14,
    color: '#666',
  },
  existingCount: {
    fontSize: 12,
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
  printButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
    marginLeft: 8,
  },
  printButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // New service-based layout styles
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
    minWidth: 200,
    maxWidth: 300,
    margin: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  serviceQuantityContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  productCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  serviceControls: {
    marginTop: 8,
  },
  controlGroup: {
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  controlPreview: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
    marginLeft: 8,
  },
  actionButtonText: {
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
  orderInfo: {
    flexDirection: 'row',
    marginLeft: 16,
    gap: 12,
  },
  orderInfoText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  scannedItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannedItemInfo: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  printModalContent: {
    maxHeight: '80%',
  },
  qrPreviewContainer: {
    maxHeight: 400,
  },
  qrPreviewItem: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  qrCodeWrapper: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 8,
  },
  qrDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  printModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalButton: {
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
  },
  rackButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
    alignItems: 'center',
  },
  rackButtonHeader: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  rackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
