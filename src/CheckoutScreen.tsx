import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { generateClient } from 'aws-amplify/data';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';
import { commonStyles } from './styles/common.styles';

const client = generateClient<Schema>();

// Define types for our transaction items
type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'service' | 'product';
  serviceId?: string;
  imageUrl?: string | null;
};

type CheckoutScreenProps = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export default function CheckoutScreen({ route, navigation }: CheckoutScreenProps) {
  const { 
    businessId, 
    customerId, 
    customerName, 
    items, 
    total, 
    pickupDate, 
    customerPreferences 
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  // Receipt options
  const [printReceipt, setPrintReceipt] = useState(true);
  const [emailReceipt, setEmailReceipt] = useState(true);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Payment options
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('card');
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const handleProcessPayment = async () => {
    if (!customerId || !businessId) {
      Alert.alert('Error', 'Missing customer or business information');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create transaction record
      const transactionResponse = await client.models.Transaction.create({
        businessID: businessId,
        customerID: customerId,
        status: 'COMPLETED',
        total: total,
        paymentMethod: paymentMethod,
        pickupDate: pickupDate,
        customerNotes: customerPreferences || '',
        receiptSent: emailReceipt,
        receiptEmail: customerEmail,
        customerPhone: customerPhone,
      });
      
      // In Amplify Gen 2, the created model is returned inside a data property
      if (!transactionResponse.data) {
        throw new Error('Failed to create transaction: No data returned');
      }
      const transactionId = transactionResponse.data.id;
      setTransactionId(transactionId);
      
      // Create transaction items
      for (const item of items) {
        await client.models.TransactionItem.create({
          transactionID: transactionId,
          itemType: item.type.toUpperCase(),
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          serviceID: item.serviceId,
          productID: item.type === 'product' ? item.id : undefined,
        });
      }
      
      setSuccess(true);
      
      // Handle receipt options
      if (emailReceipt && customerEmail) {
        // In a real app, this would call a backend service to send an email
        console.log(`Email receipt sent to ${customerEmail}`);
      }
      
      if (printReceipt) {
        // In a real app, this would trigger printing via a connected printer
        console.log('Printing receipt...');
      }
      
    } catch (error) {
      console.error('Error processing transaction:', error);
      Alert.alert('Error', 'Failed to process transaction');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompleteCheckout = () => {
    navigation.navigate('Dashboard', { businessId });
  };
  
  // Render receipt preview
  const renderReceiptPreview = () => (
    <View style={styles.receiptPreview}>
      <View style={styles.receiptHeader}>
        <Text style={styles.receiptTitle}>RECEIPT</Text>
        <Text style={styles.receiptBusinessName}>Dry Cleaning POS</Text>
        <Text style={styles.receiptDate}>{new Date().toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.receiptCustomerInfo}>
        <Text style={styles.receiptCustomerName}>Customer: {customerName}</Text>
        {customerPreferences ? (
          <Text style={styles.receiptNotes}>Notes: {customerPreferences}</Text>
        ) : null}
      </View>
      
      <View style={styles.receiptItemsHeader}>
        <Text style={[styles.receiptItemText, styles.receiptItemName]}>Item</Text>
        <Text style={[styles.receiptItemText, styles.receiptItemQty]}>Qty</Text>
        <Text style={[styles.receiptItemText, styles.receiptItemPrice]}>Price</Text>
        <Text style={[styles.receiptItemText, styles.receiptItemTotal]}>Total</Text>
      </View>
      
      <View style={styles.receiptItems}>
        {items.map((item, index) => (
          <View key={index} style={styles.receiptItem}>
            <Text style={[styles.receiptItemText, styles.receiptItemName]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.receiptItemText, styles.receiptItemQty]}>{item.quantity}</Text>
            <Text style={[styles.receiptItemText, styles.receiptItemPrice]}>${item.price.toFixed(2)}</Text>
            <Text style={[styles.receiptItemText, styles.receiptItemTotal]}>${(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.receiptTotalSection}>
        <Text style={styles.receiptTotalLabel}>Total:</Text>
        <Text style={styles.receiptTotalAmount}>${total.toFixed(2)}</Text>
      </View>
      
      <View style={styles.receiptFooter}>
        <Text style={styles.receiptPickupInfo}>Pickup Date: {formatDate(pickupDate)}</Text>
        <Text style={styles.receiptThankYou}>Thank you for your business!</Text>
        {transactionId && (
          <Text style={styles.receiptTransactionId}>Transaction ID: {transactionId}</Text>
        )}
      </View>
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Processing transaction...</Text>
      </View>
    );
  }
  
  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successHeader}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Transaction Complete!</Text>
            <Text style={styles.successMessage}>
              The order has been processed successfully.
            </Text>
          </View>
          
          {renderReceiptPreview()}
          
          <View style={styles.successActions}>
            {emailReceipt && customerEmail && (
              <Text style={styles.emailSentText}>
                Receipt has been sent to {customerEmail}
              </Text>
            )}
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={handleCompleteCheckout}
            >
              <Text style={styles.doneButtonText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.customerName}>Customer: {customerName}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.orderItems}>
            {items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.orderItemInfo}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.orderItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.orderTotal}>
            <Text style={styles.orderTotalLabel}>Total:</Text>
            <Text style={styles.orderTotalAmount}>${total.toFixed(2)}</Text>
          </View>
          
          <View style={styles.pickupInfo}>
            <Text style={styles.pickupLabel}>Pickup Date:</Text>
            <Text style={styles.pickupDate}>{formatDate(pickupDate)}</Text>
          </View>
          
          {customerPreferences ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Special Instructions:</Text>
              <Text style={styles.notesText}>{customerPreferences}</Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Contact</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email:</Text>
            <TextInput
              style={styles.input}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="customer@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone:</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Options</Text>
          
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Print Receipt</Text>
            <Switch
              value={printReceipt}
              onValueChange={setPrintReceipt}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={printReceipt ? '#2196F3' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Email Receipt</Text>
            <Switch
              value={emailReceipt}
              onValueChange={setEmailReceipt}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={emailReceipt ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'card' && styles.selectedPaymentOption
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <Text style={styles.paymentOptionText}>Credit Card</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cash' && styles.selectedPaymentOption
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Text style={styles.paymentOptionText}>Cash</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'other' && styles.selectedPaymentOption
              ]}
              onPress={() => setPaymentMethod('other')}
            >
              <Text style={styles.paymentOptionText}>Other</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[
              styles.paymentCompleteButton,
              paymentComplete && styles.paymentCompleteButtonActive
            ]}
            onPress={() => setPaymentComplete(!paymentComplete)}
          >
            <Text style={styles.paymentCompleteButtonText}>
              {paymentComplete ? '✓ Payment Received' : 'Mark as Paid'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[
            styles.processButton,
            (!paymentComplete || !customerId) && styles.processButtonDisabled
          ]}
          onPress={handleProcessPayment}
          disabled={!paymentComplete || !customerId}
        >
          <Text style={styles.processButtonText}>Complete Transaction</Text>
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
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    color: '#555',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  orderItems: {
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    color: '#333',
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  orderTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickupInfo: {
    flexDirection: 'row',
    marginTop: 16,
  },
  pickupLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginRight: 8,
  },
  pickupDate: {
    fontSize: 16,
    color: '#333',
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f4e8',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f0c14b',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedPaymentOption: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#333',
  },
  paymentCompleteButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  paymentCompleteButtonActive: {
    backgroundColor: '#e6f7e6',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  paymentCompleteButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  processButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  processButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  processButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  successContainer: {
    flex: 1,
    padding: 16,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 80,
    color: '#4CAF50',
    marginBottom: 16,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  receiptPreview: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptBusinessName: {
    fontSize: 16,
    color: '#333',
    marginVertical: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: '#666',
  },
  receiptCustomerInfo: {
    marginBottom: 16,
  },
  receiptCustomerName: {
    fontSize: 14,
    color: '#333',
  },
  receiptNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  receiptItemsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  receiptItems: {
    marginBottom: 16,
  },
  receiptItem: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  receiptItemText: {
    fontSize: 14,
    color: '#333',
  },
  receiptItemName: {
    flex: 2,
  },
  receiptItemQty: {
    flex: 0.5,
    textAlign: 'center',
  },
  receiptItemPrice: {
    flex: 1,
    textAlign: 'right',
  },
  receiptItemTotal: {
    flex: 1,
    textAlign: 'right',
  },
  receiptTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginBottom: 16,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptFooter: {
    alignItems: 'center',
  },
  receiptPickupInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  receiptThankYou: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  receiptTransactionId: {
    fontSize: 12,
    color: '#666',
  },
  successActions: {
    alignItems: 'center',
  },
  emailSentText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 16,
  },
  doneButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
