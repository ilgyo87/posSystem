import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';

// Initialize Amplify client
const client = generateClient<Schema>();

type CompletedOrderDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'CompletedOrderDetails'>;

export default function CompletedOrderDetails({ route }: CompletedOrderDetailsScreenProps) {
  const { orderId, businessId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [order, setOrder] = useState<Schema['Transaction']['type'] | null>(null);
  const [orderItems, setOrderItems] = useState<Schema['TransactionItem']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRack, setCurrentRack] = useState<string | null>(null);
  
  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

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
      
      // Verify the order is in COMPLETED status
      if (orderResult.data.status !== 'COMPLETED') {
        Alert.alert('Order Status Error', 'This order is not in completed status');
        navigation.goBack();
        return;
      }
      
      setOrder(orderResult.data);
      
      // Extract rack number from customer notes
      const notes = orderResult.data.customerNotes || '';
      const rackMatch = notes.match(/Placed on rack: ([A-Za-z0-9-]+)/);
      if (rackMatch && rackMatch[1]) {
        setCurrentRack(rackMatch[1]);
      } else {
        const reassignMatch = notes.match(/Reassigned on rack: ([A-Za-z0-9-]+)/);
        if (reassignMatch && reassignMatch[1]) {
          setCurrentRack(reassignMatch[1]);
        }
      }
      
      // Fetch order items
      const orderItemsResult = await client.models.TransactionItem.list({
        filter: { transactionID: { eq: orderId } }
      });
      
      if (orderItemsResult.errors) {
        Alert.alert('Error', 'Failed to fetch order items');
      } else {
        setOrderItems(orderItemsResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleReassignRack = () => {
    // Navigate to RackAssignment screen
    navigation.navigate('RackAssignment', { 
      orderId: orderId,
      businessId: businessId 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Completed Order Details</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Orders</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.orderInfoSection}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>{order.id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer ID:</Text>
            <Text style={styles.infoValue}>{order.customerID || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{order.createdAt ? formatDate(order.createdAt) : 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total:</Text>
            <Text style={styles.infoValue}>${Number(order.total || 0).toFixed(2)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{order.paymentMethod || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Rack:</Text>
            <Text style={styles.infoValue}>{currentRack || 'Not assigned'}</Text>
          </View>
        </View>
        
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          
          {orderItems.length === 0 ? (
            <Text style={styles.noItemsText}>No items found for this order</Text>
          ) : (
            orderItems.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemType}>{item.itemType}</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>${Number(item.price || 0).toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
        
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{order.customerNotes || 'No notes available'}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.reassignButton}
          onPress={handleReassignRack}
        >
          <Text style={styles.reassignButtonText}>Reassign Rack</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  orderInfoSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontWeight: 'bold',
    color: '#555',
  },
  infoValue: {
    flex: 1,
    color: '#333',
  },
  itemsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  noItemsText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#555',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  notesSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  notesText: {
    color: '#333',
    lineHeight: 20,
  },
  reassignButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  reassignButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
