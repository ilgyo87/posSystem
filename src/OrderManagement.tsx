import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';
// Import the GraphQL queries and mutations
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';

// Initialize Amplify client
const client = generateClient<Schema>();

type OrderManagementScreenProps = NativeStackScreenProps<RootStackParamList, 'OrderManagement'>;

// Order statuses
const ORDER_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
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

  useEffect(() => {
    fetchOrders();
    
    // Set up a focus listener to refresh orders when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    
    return unsubscribe;
  }, [businessId]);

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
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetails = (order: Schema['Transaction']['type']) => {
    navigation.navigate('OrderDetails' as any, { 
      orderId: order.id, 
      businessId 
    });
  };

  const handleScanBarcode = () => {
    navigation.navigate('BarcodeScanner' as any, { 
      businessId,
      onScan: (barcodeData: string) => {
        // On successful scan, search for the order with this barcode
        const filteredOrders = orders.filter(
          order => order.id === barcodeData
        );
        
        if (filteredOrders.length > 0) {
          // Navigate to the order details
          handleViewOrderDetails(filteredOrders[0]);
        } else {
          // No order found with this barcode
          Alert.alert(
            'Order Not Found', 
            `No order found with ID/Number: ${barcodeData}`,
            [
              { text: 'OK' },
              { 
                text: 'Create New', 
                onPress: () => navigation.navigate('CustomerSelection' as any, { businessId })
              }
            ]
          );
        }
      }
    });
  };

  const getFilteredOrders = () => {
    return orders.filter(order => {
      const matchesSearch = 
        searchQuery === '' || 
        // Use ID instead of orderNumber since it doesn't exist in the model
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = 
        filterStatus === '' || 
        order.status === filterStatus;
        
      return matchesSearch && matchesStatus;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderOrderItem = ({ item }: { item: Schema['Transaction']['type'] }) => {
    return (
      <TouchableOpacity 
        style={styles.orderItem}
        onPress={() => handleViewOrderDetails(item)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>#{item.id.substring(0, 8)}</Text>
          <Text style={[
            styles.orderStatus,
            { 
              color: 
                item.status === 'COMPLETED' ? '#4CAF50' :
                item.status === 'CANCELLED' ? '#F44336' :
                item.status === 'PROCESSING' ? '#2196F3' : 
                '#FFC107'
            }
          ]}>
            {item.status}
          </Text>
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.orderCustomer}>
            Customer ID: {item.customerID || 'N/A'}
          </Text>
          <Text style={styles.orderDate}>
            {item.createdAt ? formatDate(item.createdAt) : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>
            Total: ${Number(item.total || 0).toFixed(2)}
          </Text>
          <Text style={styles.orderItems}>
            Order Items
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order number or ID"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleScanBarcode}
        >
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by status:</Text>
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[
              styles.filterOption,
              filterStatus === '' && styles.filterOptionActive
            ]}
            onPress={() => setFilterStatus('')}
          >
            <Text style={styles.filterOptionText}>All</Text>
          </TouchableOpacity>
          
          {Object.entries(ORDER_STATUSES).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterOption,
                filterStatus === key && styles.filterOptionActive
              ]}
              onPress={() => setFilterStatus(key)}
            >
              <Text style={styles.filterOptionText}>{value}</Text>
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
                No orders found
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CustomerSelection', { businessId })}
              >
                <Text style={styles.createButtonText}>Create New Order</Text>
              </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
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
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 4,
  },
  scanButtonText: {
    color: '#fff',
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
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#2196F3',
  },
  filterOptionText: {
    color: '#333',
    fontSize: 14,
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
  orderItems: {
    fontSize: 14,
    color: '#666',
  },
});
