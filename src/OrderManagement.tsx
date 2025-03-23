import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';
// Import the GraphQL queries and mutations
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import QRCode from 'react-native-qrcode-svg';
import { QRScanner } from './components/QRScanner';

// Initialize Amplify client
const client = generateClient<Schema>();

type OrderManagementScreenProps = NativeStackScreenProps<RootStackParamList, 'OrderManagement'>;

// Order statuses
const ORDER_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  CLEANED: 'Cleaned',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export default function OrderManagement({ route }: OrderManagementScreenProps) {
  const { businessId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [orders, setOrders] = useState<Schema['Transaction']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Schema['Transaction']['type'] | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [garments, setGarments] = useState<Schema['Garment']['type'][]>([]);
  const [selectedItem, setSelectedItem] = useState<Schema['TransactionItem']['type'] | null>(null);
  const [garmentDescription, setGarmentDescription] = useState('');

  useEffect(() => {
    fetchOrders();
    
    // Set up a focus listener to refresh orders when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    
    return unsubscribe;
  }, [businessId, filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const ordersResult = await client.models.Transaction.list({
        filter: { businessID: { eq: businessId } }
      });
      
      // Sort manually since sort option isn't available in the filter type
      const sortedOrders = ordersResult.data ? [...ordersResult.data].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }) : [];
      
      if (ordersResult.errors) {
        console.error('Error fetching orders:', ordersResult.errors);
        Alert.alert('Error', 'Failed to fetch orders');
      } else {
        // For each order, fetch customer details
        const ordersWithCustomerInfo = await Promise.all(sortedOrders.map(async (order) => {
          try {
            if (order.customerID) {
              const customerResult = await client.models.Customer.get({
                id: order.customerID
              });
              
              if (customerResult.data) {
                // Add customer info to the order object
                return {
                  ...order,
                  customerFirstName: customerResult.data.firstName,
                  customerLastName: customerResult.data.lastName
                };
              }
            }
            return order;
          } catch (err) {
            console.error('Error fetching customer for order:', err);
            return order;
          }
        }));
        
        setOrders(ordersWithCustomerInfo);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchGarments = async (orderId: string) => {
    try {
      const itemsResult = await client.models.TransactionItem.list({
        filter: { transactionID: { eq: orderId } }
      });

      if (itemsResult.errors) {
        throw new Error('Failed to fetch order items');
      }

      const garmentsPromises = itemsResult.data?.map(async (item) => {
        const garmentsResult = await client.models.Garment.list({
          filter: { transactionItemID: { eq: item.id } }
        });
        return garmentsResult.data || [];
      }) || [];

      const garmentsResults = await Promise.all(garmentsPromises);
      const allGarments = garmentsResults.flat();
      setGarments(allGarments);
    } catch (error) {
      console.error('Error fetching garments:', error);
      Alert.alert('Error', 'Failed to fetch garments');
    }
  };

  const handleViewOrderDetails = (order: Schema['Transaction']['type']) => {
    // If order status is CLEANED, navigate to RackAssignment screen
    if (order.status === 'CLEANED') {
      navigation.navigate('RackAssignment', { 
        orderId: order.id, 
        businessId 
      });
    } 
    // If order status is COMPLETED, navigate to CompletedOrderDetails screen
    else if (order.status === 'COMPLETED') {
      navigation.navigate('CompletedOrderDetails', { 
        orderId: order.id, 
        businessId 
      });
    } else {
      // For all other statuses, navigate to OrderDetails as before
      navigation.navigate('OrderDetails' as any, { 
        orderId: order.id, 
        businessId 
      });
    }
  };

  const handleScanBarcode = () => {
    setShowScanModal(true);
  };

  const handleQRScan = async (qrCode: string) => {
    try {
      // First try to find a garment with this QR code
      const garmentResult = await client.models.Garment.list({
        filter: { qrCode: { eq: qrCode } }
      });

      if (garmentResult.data && garmentResult.data.length > 0) {
        // Found a garment, update its status
        const garment = garmentResult.data[0];
        const updateResult = await client.models.Garment.update({
          id: garment.id,
          lastScanned: new Date().toISOString(),
          status: 'IN_PROGRESS'
        });

        if (updateResult.errors || !updateResult.data) {
          throw new Error('Failed to update garment status');
        }

        setGarments(prevGarments => 
          prevGarments.map(g => g.id === garment.id ? updateResult.data! : g)
        );
        Alert.alert('Success', 'Garment status updated successfully');
      } else {
        // Try to find an order with this QR code
        const orderResult = await client.models.Transaction.list({
          filter: { id: { eq: qrCode } }
        });

        if (orderResult.data && orderResult.data.length > 0) {
          const order = orderResult.data[0];
          navigation.navigate('OrderDetails' as any, { 
            orderId: order.id, 
            businessId 
          });
        } else {
          Alert.alert('Not Found', 'No order or garment found with this QR code');
        }
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      Alert.alert('Error', 'Failed to process QR code');
    } finally {
      setShowScanModal(false);
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
        status: 'PENDING',
        type: 'STANDARD' // Adding required type field
      });

      if (garmentResult.errors || !garmentResult.data) {
        throw new Error('Failed to create garment');
      }

      setGarments(prevGarments => [...prevGarments, garmentResult.data!]);
      setShowQRModal(false);
      setGarmentDescription('');
      Alert.alert('Success', 'Garment QR code generated successfully');
    } catch (error) {
      console.error('Error creating garment:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  const handleViewGarments = async (order: Schema['Transaction']['type']) => {
    setSelectedOrder(order);
    await fetchGarments(order.id);
    setShowQRModal(true);
  };

  const getFilteredOrders = () => {
    return orders.filter(order => {
      const matchesSearch = 
        searchQuery === '' || 
        // Search by order ID or customer name
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order as any).customerFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order as any).customerLastName?.toLowerCase().includes(searchQuery.toLowerCase());
        
      // Make the status comparison case-insensitive
      const orderStatus = order.status || '';
      const matchesStatus = 
        filterStatus === '' || 
        orderStatus.toUpperCase() === filterStatus;
        
      return matchesSearch && matchesStatus;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getOrderCounts = () => {
    const counts = {
      ALL: orders.length,
      PENDING: 0,
      PROCESSING: 0,
      CLEANED: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };
    
    orders.forEach(order => {
      const status = order.status ? order.status.toUpperCase() : '';
      if (counts[status as keyof typeof counts] !== undefined) {
        counts[status as keyof typeof counts]++;
      } else {
        console.log('Unknown status:', order.status);
      }
    });
    
    return counts;
  };

  const orderCounts = getOrderCounts();

  const handleFilterByStatus = (status: string) => {
    setFilterStatus(status);
    console.log(`Filtering by status: ${status}`);
  }
  
  const handleSubmitEditing = () => {
    const filteredOrders = getFilteredOrders();
    // If there's exactly one order in the filtered results, navigate to it
    if (filteredOrders.length === 1) {
      handleViewOrderDetails(filteredOrders[0]);
    } 
    // If there are multiple results, navigate to the first one
    else if (filteredOrders.length > 1) {
      handleViewOrderDetails(filteredOrders[0]);
    }
  }

  const renderOrderItem = ({ item }: { item: Schema['Transaction']['type'] }) => {
    const status = item.status ? item.status.toUpperCase() : 'PENDING';
    const displayStatus = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || status;
    
    return (
      <TouchableOpacity 
        style={styles.orderItem}
        onPress={() => handleViewOrderDetails(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Order ID: {item.id}</Text>
          <Text style={[
            styles.orderStatus,
            { 
              color: 
                status === 'COMPLETED' ? '#4CAF50' :
                status === 'CANCELLED' ? '#F44336' :
                status === 'PROCESSING' ? '#2196F3' :
                status === 'CLEANED' ? '#9C27B0' :
                '#FFC107'
            }
          ]}>
            {displayStatus}
          </Text>
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.orderCustomer}>
            {(item as any).customerFirstName && (item as any).customerLastName 
              ? `${(item as any).customerFirstName} ${(item as any).customerLastName}` 
              : `Customer ID: ${item.customerID || 'N/A'}`}
          </Text>
          <Text style={styles.orderDate}>
            {item.createdAt ? formatDate(item.createdAt) : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>
            Total: ${Number(item.total || 0).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode}>
          <Text style={styles.scanButtonText}>Scan QR</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order number or ID"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="go"
        />
      </View>
      
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by status:</Text>
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[
              styles.filterOption,
              filterStatus === '' && styles.filterOptionActive
            ]}
            onPress={() => handleFilterByStatus('')}
          >
            <Text style={[
              styles.filterOptionText,
              filterStatus === '' && styles.filterOptionTextActive
            ]}>All ({orderCounts.ALL})</Text>
          </TouchableOpacity>
          
          {Object.entries(ORDER_STATUSES).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterOption,
                filterStatus === key && styles.filterOptionActive
              ]}
              onPress={() => handleFilterByStatus(key)}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === key && styles.filterOptionTextActive
              ]}>{value} ({orderCounts[key as keyof typeof orderCounts] || 0})</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <>
          {getFilteredOrders().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {filterStatus 
                  ? `No orders with status "${ORDER_STATUSES[filterStatus as keyof typeof ORDER_STATUSES] || filterStatus}" found` 
                  : "No orders found"}
              </Text>
              {filterStatus === '' && (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CustomerSelection', { businessId })}
                >
                  <Text style={styles.createButtonText}>Create New Order</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={getFilteredOrders()}
              renderItem={renderOrderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.ordersList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* QR Code Generation Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedItem ? 'Generate Garment QR Code' : 'Manage Garments'}
            </Text>
            
            {selectedItem ? (
              <>
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
                      setSelectedItem(null);
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
              </>
            ) : (
              <>
                <View style={styles.garmentsList}>
                  {garments.map(garment => (
                    <View key={garment.id} style={styles.garmentItem}>
                      <Text style={styles.garmentDescription}>{garment.description}</Text>
                      <Text style={styles.garmentStatus}>Status: {garment.status}</Text>
                      {garment.lastScanned && (
                        <Text style={styles.garmentScanned}>
                          Last scanned: {formatDate(garment.lastScanned)}
                        </Text>
                      )}
                      <View style={styles.garmentActions}>
                        <TouchableOpacity 
                          style={styles.viewQRButton}
                          onPress={() => {
                            setSelectedItem({ id: garment.transactionItemID } as Schema['TransactionItem']['type']);
                            setGarmentDescription(garment.description);
                            setShowQRModal(false);
                            setTimeout(() => setShowQRModal(true), 100);
                          }}
                        >
                          <Text style={styles.viewQRButtonText}>View QR Code</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={() => setShowQRModal(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        onRequestClose={() => setShowScanModal(false)}
      >
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanModal(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  filterOption: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  filterOptionActive: {
    backgroundColor: '#2196F3',
  },
  filterOptionText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterOptionTextActive: {
    color: '#fff',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  ordersList: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderDetails: {
    marginBottom: 8,
  },
  orderCustomer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  manageGarmentsButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
  },
  manageGarmentsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    padding: 20,
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
  garmentsList: {
    flex: 1,
  },
  garmentItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  garmentDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  garmentStatus: {
    fontSize: 14,
    color: '#666',
  },
  garmentScanned: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  garmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  viewQRButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
  },
  viewQRButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
