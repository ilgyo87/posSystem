import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';
import { QRScanner } from './components/QRScanner';

// Initialize Amplify client
const client = generateClient<Schema>();

type RackAssignmentScreenProps = NativeStackScreenProps<RootStackParamList, 'RackAssignment'>;

export default function RackAssignment({ route }: RackAssignmentScreenProps) {
  const { orderId, businessId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Schema['Transaction']['type'] | null>(null);
  const [rackScanInput, setRackScanInput] = useState('');
  const [processingAssignment, setProcessingAssignment] = useState(false);
  const [currentRack, setCurrentRack] = useState<string | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  
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
      
      // Verify the order is in CLEANED status
      if (orderResult.data.status !== 'CLEANED') {
        Alert.alert('Order Status Error', 'This order is not ready for rack assignment');
        navigation.goBack();
        return;
      }
      
      setOrder(orderResult.data);
      
      // Check if this order already has a rack assigned
      // Look for rack assignment in customer notes
      const notes = orderResult.data.customerNotes || '';
      const rackMatch = notes.match(/Placed on rack: ([A-Za-z0-9-]+)/);
      if (rackMatch && rackMatch[1]) {
        setCurrentRack(rackMatch[1]);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleRackAssignment = async () => {
    if (!rackScanInput.trim()) {
      Alert.alert('Error', 'Please scan or enter the rack number');
      return;
    }

    try {
      setProcessingAssignment(true);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Check if updating or assigning for the first time
      const isReassigning = currentRack !== null;
      
      // Update the order with the rack number and change status to COMPLETED
      const updateResult = await client.models.Transaction.update({
        id: order.id,
        status: 'COMPLETED',
        customerNotes: `${order.customerNotes || ''}\n[${new Date().toLocaleString()}] Status changed: CLEANED → COMPLETED\n[${new Date().toLocaleString()}] ${isReassigning ? 'Reassigned' : 'Placed'} on rack: ${rackScanInput}`
      });
      
      if (updateResult.errors) {
        throw new Error('Failed to update order');
      }
      
      // Navigate directly to OrderManagement screen without showing notification
      navigation.navigate('OrderManagement', { businessId });
    } catch (error) {
      console.error('Error assigning rack:', error);
      Alert.alert('Error', 'Failed to complete the order');
    } finally {
      setProcessingAssignment(false);
    }
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rack Assignment</Text>
        <Text style={styles.orderNumber}>Order #{order.id.substring(0, 8)}</Text>
        <Text style={styles.customerName}>Customer: {order.customerID || 'N/A'}</Text>
        <Text style={styles.status}>Status: {order.status}</Text>
      </View>

      {order.customerNotes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Order Notes</Text>
          <Text style={styles.notesText}>{order.customerNotes}</Text>
        </View>
      )}

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {currentRack 
            ? `This order is currently on rack: ${currentRack}. Scan or enter a new rack number to reassign.` 
            : 'Scan or enter the rack number where this order will be stored.'}
        </Text>
      </View>

      <View style={styles.scanSection}>
        <TextInput
          style={styles.input}
          placeholder="Scan or enter rack number"
          value={rackScanInput}
          onChangeText={setRackScanInput}
          onSubmitEditing={handleRackAssignment}
          autoFocus
        />
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => setShowScanModal(true)}
        >
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={handleRackAssignment}
        disabled={processingAssignment}
      >
        {processingAssignment ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{currentRack ? 'Reassign' : 'Assign'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => navigation.reset({
          index: 0,
          routes: [{ 
            name: 'CustomerSelection',
            params: { businessId } 
          }],
        })}
      >
        <Text style={styles.cancelButtonText}>Start New Order</Text>
      </TouchableOpacity>
      
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
                setRackScanInput(qrCode);
                setShowScanModal(false);
                // Auto submit if rack code scanned
                if (qrCode.trim()) {
                  setTimeout(() => handleRackAssignment(), 500);
                }
              }}
              onClose={() => setShowScanModal(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  status: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  notesSection: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
  },
  instructionsText: {
    fontSize: 16,
    color: '#0d47a1',
    textAlign: 'center',
  },
  scanSection: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    height: '80%',
    overflow: 'hidden',
  },
}); 