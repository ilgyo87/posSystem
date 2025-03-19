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
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';
import QRCode from 'react-native-qrcode-svg';
// Import the GraphQL queries and mutations
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';

// Initialize Amplify client
const client = generateClient<Schema>();

type OrderDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'OrderDetails'>;

// Order statuses
const ORDER_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export default function OrderDetails({ route }: OrderDetailsScreenProps) {
  const { orderId, businessId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [order, setOrder] = useState<Schema['Transaction']['type'] | null>(null);
  const [orderItems, setOrderItems] = useState<Schema['TransactionItem']['type'][]>([]);
  const [garments, setGarments] = useState<Schema['Garment']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Schema['TransactionItem']['type'] | null>(null);
  const [garmentDescription, setGarmentDescription] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedGarment, setSelectedGarment] = useState<Schema['Garment']['type'] | null>(null);
  const [showQRDisplayModal, setShowQRDisplayModal] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch order details
      const orderResult = await client.models.Transaction.get({ id: orderId });
      
      if (orderResult.errors) {
        console.error('Error fetching order:', orderResult.errors);
        Alert.alert('Error', 'Failed to fetch order details');
        navigation.goBack();
        return;
      }
      
      if (!orderResult.data) {
        Alert.alert('Error', 'Order not found');
        navigation.goBack();
        return;
      }
      
      setOrder(orderResult.data);
      
      // Fetch order items
      const orderItemsResult = await client.models.TransactionItem.list({
        filter: { transactionID: { eq: orderId } }
      });
      
      if (orderItemsResult.errors) {
        console.error('Error fetching order items:', orderItemsResult.errors);
        Alert.alert('Error', 'Failed to fetch order items');
      } else {
        setOrderItems(orderItemsResult.data || []);
        
        // Fetch garments for each item
        const garmentsPromises = orderItemsResult.data?.map(async (item) => {
          const garmentsResult = await client.models.Garment.list({
            filter: { transactionItemID: { eq: item.id } }
          });
          return garmentsResult.data || [];
        }) || [];
        
        const garmentsResults = await Promise.all(garmentsPromises);
        const allGarments = garmentsResults.flat();
        setGarments(allGarments);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async (item: Schema['TransactionItem']['type']) => {
    setSelectedItem(item);
    setShowQRModal(true);
  };

  const handleCreateGarment = async () => {
    if (!selectedItem || !garmentDescription.trim()) return;

    try {
      const garmentResult = await client.models.Garment.create({
        transactionItemID: selectedItem.id,
        qrCode: `${selectedItem.id}-${Date.now()}`,
        description: garmentDescription,
        status: 'PENDING'
      });

      if (garmentResult.errors || !garmentResult.data) {
        throw new Error('Failed to create garment');
      }

      const newGarment = garmentResult.data;
      setGarments(prevGarments => [...prevGarments, newGarment]);
      setShowQRModal(false);
      setGarmentDescription('');
      Alert.alert('Success', 'Garment QR code generated successfully');
    } catch (error) {
      console.error('Error creating garment:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  const handleScanQR = () => {
    setShowScanModal(true);
  };

  const handleQRScan = async (qrCode: string) => {
    try {
      const garmentResult = await client.models.Garment.list({
        filter: { qrCode: { eq: qrCode } }
      });

      if (!garmentResult.data || garmentResult.data.length === 0) {
        Alert.alert('Error', 'No garment found with this QR code');
        return;
      }

      const garment = garmentResult.data[0];
      const updateResult = await client.models.Garment.update({
        id: garment.id,
        lastScanned: new Date().toISOString(),
        status: 'IN_PROGRESS'
      });

      if (updateResult.errors || !updateResult.data) {
        throw new Error('Failed to update garment status');
      }

      const updatedGarment = updateResult.data;
      setGarments(prevGarments => prevGarments.map(g => 
        g.id === garment.id ? updatedGarment : g
      ));
      Alert.alert('Success', 'Garment status updated successfully');
    } catch (error) {
      console.error('Error scanning QR code:', error);
      Alert.alert('Error', 'Failed to process QR code');
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;
    
    try {
      setUpdating(true);
      
      const updateResult = await client.models.Transaction.update({
        id: order.id,
        status: newStatus
      });
      
      if (updateResult.errors) {
        console.error('Error updating order status:', updateResult.errors);
        Alert.alert('Error', 'Failed to update order status');
      } else {
        setOrder({ ...order, status: newStatus });
        Alert.alert('Success', `Order status updated to ${ORDER_STATUSES[newStatus as keyof typeof ORDER_STATUSES]}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const generateBarcode = () => {
    // In a real app, you would generate and display a barcode image
    // For now, we'll just display the order ID
    Alert.alert(
      'Order Barcode',
      `Order ID: ${order?.id}`,
      [{ text: 'OK' }]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleViewQR = (garment: Schema['Garment']['type']) => {
    setSelectedGarment(garment);
    setShowQRDisplayModal(true);
  };

  const renderOrderItem = ({ item }: { item: Schema['TransactionItem']['type'] }) => {
    const itemGarments = garments.filter(g => g.transactionItemID === item.id);
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
          <Text style={styles.itemGarments}>
            Garments: {itemGarments.length}
          </Text>
        </View>
        
        <View style={styles.itemTotal}>
          <Text style={styles.itemTotalText}>
            Subtotal: ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
          </Text>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleGenerateQR(item)}
          >
            <Text style={styles.actionButtonText}>Generate QR</Text>
          </TouchableOpacity>
        </View>

        {itemGarments.length > 0 && (
          <View style={styles.garmentsList}>
            {itemGarments.map(garment => (
              <View key={garment.id} style={styles.garmentItem}>
                <Text style={styles.garmentDescription}>{garment.description}</Text>
                <Text style={styles.garmentStatus}>Status: {garment.status}</Text>
                {garment.lastScanned && (
                  <Text style={styles.garmentScanned}>
                    Last scanned: {formatDate(garment.lastScanned)}
                  </Text>
                )}
                <TouchableOpacity 
                  style={styles.viewQRButton}
                  onPress={() => handleViewQR(garment)}
                >
                  <Text style={styles.viewQRButtonText}>View QR Code</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
        <Text style={styles.orderNumber}>Order #{order.id.substring(0, 8)}</Text>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: 
              order.status === 'COMPLETED' ? '#4CAF50' :
              order.status === 'CANCELLED' ? '#F44336' :
              order.status === 'PROCESSING' ? '#2196F3' : 
              '#FFC107'
          }
        ]}>
          <Text style={styles.statusText}>
            {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] || order.status}
          </Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID:</Text>
              <Text style={styles.infoValue}>{order.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer:</Text>
              <Text style={styles.infoValue}>Customer ID: {order.customerID || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>{formatDate(order.updatedAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total:</Text>
              <Text style={styles.infoValue}>${Number(order.total || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method:</Text>
              <Text style={styles.infoValue}>{order.paymentMethod || 'Not specified'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notes:</Text>
              <Text style={styles.infoValue}>{order.customerNotes || 'None'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {orderItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={styles.emptyText}>No items in this order</Text>
            </View>
          ) : (
            <FlatList
              data={orderItems}
              renderItem={renderOrderItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                ${Number(order.total || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleScanQR}
          >
            <Text style={styles.actionButtonText}>Scan QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => navigation.navigate('EditOrder', { 
              orderId: order.id,
              businessId 
            })}
          >
            <Text style={styles.actionButtonText}>Edit Order</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusButtons}>
          {order.status !== 'PROCESSING' && (
            <TouchableOpacity 
              style={[styles.statusButton, { backgroundColor: '#2196F3' }]}
              onPress={() => updateOrderStatus('PROCESSING')}
              disabled={updating}
            >
              <Text style={styles.statusButtonText}>
                {updating ? 'Updating...' : 'Mark Processing'}
              </Text>
            </TouchableOpacity>
          )}
          
          {order.status !== 'COMPLETED' && (
            <TouchableOpacity 
              style={[styles.statusButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => updateOrderStatus('COMPLETED')}
              disabled={updating}
            >
              <Text style={styles.statusButtonText}>
                {updating ? 'Updating...' : 'Mark Completed'}
              </Text>
            </TouchableOpacity>
          )}
          
          {order.status !== 'CANCELLED' && (
            <TouchableOpacity 
              style={[styles.statusButton, { backgroundColor: '#F44336' }]}
              onPress={() => {
                Alert.alert(
                  'Confirm Cancellation',
                  'Are you sure you want to cancel this order?',
                  [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes', onPress: () => updateOrderStatus('CANCELLED') }
                  ]
                );
              }}
              disabled={updating}
            >
              <Text style={styles.statusButtonText}>
                {updating ? 'Updating...' : 'Cancel Order'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* QR Code Generation Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate Garment QR Code</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter garment description"
              value={garmentDescription}
              onChangeText={setGarmentDescription}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowQRModal(false);
                  setGarmentDescription('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateGarment}
                disabled={!garmentDescription.trim()}
              >
                <Text style={styles.modalButtonText}>Generate QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan Garment QR Code</Text>
            
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={() => {
                setShowScanModal(false);
                navigation.navigate('BarcodeScanner', {
                  businessId,
                  onScan: handleQRScan
                });
              }}
            >
              <Text style={styles.scanButtonText}>Start Scanning</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowScanModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Code Display Modal */}
      <Modal
        visible={showQRDisplayModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Garment QR Code</Text>
            
            {selectedGarment && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={selectedGarment.qrCode}
                  size={200}
                />
                <Text style={styles.qrDescription}>{selectedGarment.description}</Text>
                <Text style={styles.qrStatus}>Status: {selectedGarment.status}</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setShowQRDisplayModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDetails: {
    marginBottom: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemOptions: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  itemTotalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  emptyItems: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountText: {
    color: '#4CAF50',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
    minWidth: '30%',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
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
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  garmentsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  garmentItem: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  garmentDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  garmentStatus: {
    fontSize: 12,
    color: '#666',
  },
  garmentScanned: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  itemGarments: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  viewQRButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewQRButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 16,
  },
  qrDescription: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  qrStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
