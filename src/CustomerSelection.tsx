import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { generateClient } from 'aws-amplify/data';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from '../src/types';

// Define Customer type based on the schema
type Customer = {
  id: string;
  businessID: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  [key: string]: any; // For other properties that might exist
};

const client = generateClient<Schema>();

type CustomerSelectionProps = NativeStackScreenProps<RootStackParamList, 'CustomerSelection'>;

export default function CustomerSelection({ route, navigation }: CustomerSelectionProps) {
  const { businessId } = route.params || {};
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  
  // New customer form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  
  // Navigation is now handled by the header button in App.tsx

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const result = await client.models.Customer.list({
        filter: { businessID: { eq: businessId as string } }
      });
      
      if (result.errors) {
        console.error('Errors fetching customers:', result.errors);
        Alert.alert('Error', 'Failed to fetch customers');
      } else {
        // Cast the result to our Customer type
        setCustomers(result.data as unknown as Customer[] || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!firstName || !lastName || !phoneNumber) {
      Alert.alert('Error', 'Please fill out all required fields');
      return;
    }

    if (!businessId) {
      Alert.alert('Error', 'Business ID is required');
      return;
    }

    try {
      // Format phone number (simple E.164 format for US numbers)
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      if (!businessId) {
        Alert.alert('Error', 'Business ID is required');
        return;
      }

      const result = await client.models.Customer.create({
        businessID: businessId as string,
        firstName,
        lastName,
        phoneNumber: formattedPhone,
        email: email || undefined,
        preferredContactMethod: 'EMAIL',
        notificationPreferences: true
      });

      if (result.errors) {
        Alert.alert('Error creating customer', JSON.stringify(result.errors));
      } else {
        // Skip notification and navigate directly to ProductSelection
        const newCustomer = result.data;
        // Reset form and close modal
        resetForm();
        setModalVisible(false);
        
        // Navigate to ProductSelection with the new customer
        if (newCustomer) {
          navigation.navigate('ProductSelection', {
            businessId,
            customerId: newCustomer.id,
            customerName: `${newCustomer.firstName} ${newCustomer.lastName}`
          });
        } else {
          // This shouldn't happen, but just in case
          console.error('Customer created but data is null');
          // Refresh customer list as fallback
          fetchCustomers();
        }
      }
    } catch (error: any) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', error.message || 'Failed to create customer');
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setEmail('');
  };

  // Format phone number to E.164 format
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const digits = phone.replace(/\\D/g, '');
    
    // For US numbers, format as +1XXXXXXXXXX
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    // If number already has country code
    if (digits.length > 10 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    return digits;
  };

  const selectCustomer = (customer: Customer) => {
    // Navigate to the ProductSelection screen with customer info
    navigation.navigate('ProductSelection', {
      businessId,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`
    });
  };

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
    const phone = customer.phoneNumber || '';
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || phone.includes(query);
  });

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={styles.customerItem}
      onPress={() => selectCustomer(item)}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.customerPhone}>{item.phoneNumber}</Text>
        {item.email && <Text style={styles.customerEmail}>{item.email}</Text>}
      </View>
      <TouchableOpacity style={styles.selectButton}>
        <Text style={styles.selectButtonText}>Select</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Selection</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ New Customer</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or phone"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <>
          {customers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No customers found</Text>
              <Text>Create a new customer to get started</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              renderItem={renderCustomerItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={filteredCustomers.length === 0 && styles.emptyList}
              ListEmptyComponent={
                <Text style={styles.noResults}>No customers match your search</Text>
              }
            />
          )}
        </>
      )}

      {/* Create Customer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Customer</Text>
            
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              value={firstName}
              onChangeText={setFirstName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              value={lastName}
              onChangeText={setLastName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateCustomer}
              >
                <Text style={styles.saveButtonText}>Create</Text>
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
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  list: {
    flex: 1,
  },
  customerItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerPhone: {
    color: '#666',
    marginBottom: 2,
  },
  customerEmail: {
    color: '#666',
    fontSize: 12,
  },
  selectButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  selectButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
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
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
