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
  Image,
} from 'react-native';
import { generateClient } from 'aws-amplify/data';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from '../src/types';
import { v4 as uuidv4 } from 'uuid';

// Define Customer type based on the schema
type Customer = {
  id: string;
  businessID: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  qrCode: string;
  globalId?: string;
  preferredContactMethod?: string;
  notificationPreferences?: boolean;
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
  const [scanQrModalVisible, setScanQrModalVisible] = useState(false);
  const [searchingGlobally, setSearchingGlobally] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<Customer[]>([]);
  
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

  // Search for existing customer profiles globally by phone number
  const searchGlobalCustomers = async (phone: string) => {
    setSearchingGlobally(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const result = await client.models.Customer.list({
        filter: { phoneNumber: { eq: formattedPhone } }
      });
      
      if (result.errors) {
        console.error('Error searching customers:', result.errors);
      } else if (result.data && result.data.length > 0) {
        // Filter out customers from the current business
        const otherBusinessCustomers = result.data.filter(c => c.businessID !== businessId);
        setGlobalSearchResults(otherBusinessCustomers as unknown as Customer[]);
        return otherBusinessCustomers as unknown as Customer[];
      } else {
        setGlobalSearchResults([]);
        return [];
      }
    } catch (error) {
      console.error('Error searching global customers:', error);
      setGlobalSearchResults([]);
      return [];
    } finally {
      setSearchingGlobally(false);
    }
  };

  // Generate a unique QR code for a customer
  const generateQrCode = () => {
    // Generate a UUID and use it as the QR code
    return uuidv4();
  };

  // Generate a global ID for a customer (to link across businesses)
  const generateGlobalId = () => {
    return uuidv4();
  };

  // Handle QR code scan result
  const handleQrCodeScanned = async (qrCode: string) => {
    setScanQrModalVisible(false);
    setLoading(true);
    
    try {
      // Search for customer by QR code
      const result = await client.models.Customer.list({
        filter: { qrCode: { eq: qrCode } }
      });
      
      if (result.errors) {
        console.error('Error searching by QR code:', result.errors);
        Alert.alert('Error', 'Failed to search by QR code');
      } else if (result.data && result.data.length > 0) {
        const existingCustomer = result.data[0] as Customer;
        
        // Check if this customer already belongs to this business
        if (existingCustomer.businessID === businessId) {
          // Customer already belongs to this business
          selectCustomer(existingCustomer);
        } else {
          // Create a new customer for this business but link it with the global ID
          const newCustomer = await createCustomerFromExisting(existingCustomer);
          if (newCustomer) {
            handleNewCustomerCreated(newCustomer, existingCustomer.firstName, existingCustomer.lastName);
            Alert.alert('Success', 'Customer added to this business');
          } else {
            Alert.alert('Error', 'Failed to add customer to this business');
          }
        }
      } else {
        Alert.alert('Not Found', 'No customer found with this QR code');
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'Failed to process QR code');
    } finally {
      setLoading(false);
    }
  };

  // Create a new customer based on an existing one from another business
  const createCustomerFromExisting = async (existingCustomer: Customer) => {
    try {
      // Use the same global ID if it exists, or create a new one
      const globalId = existingCustomer.globalId || generateGlobalId();
      
      const result = await client.models.Customer.create({
        businessID: businessId as string,
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        phoneNumber: existingCustomer.phoneNumber,
        email: existingCustomer.email || undefined,
        qrCode: existingCustomer.qrCode, // Use the same QR code for recognition
        globalId: globalId, // Link to the same customer across businesses
        preferredContactMethod: 'EMAIL',
        notificationPreferences: true
      });
      
      if (result.errors) {
        console.error('Error creating customer:', result.errors);
        return null;
      }
      
      return result.data as Customer;
    } catch (error) {
      console.error('Error creating customer from existing:', error);
      return null;
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
      
      // First check if a customer with this phone number already exists in this business
      const existingInBusinessResult = await client.models.Customer.list({
        filter: { 
          and: [
            { businessID: { eq: businessId as string } },
            { phoneNumber: { eq: formattedPhone } }
          ]
        }
      });
      
      if (existingInBusinessResult.data && existingInBusinessResult.data.length > 0) {
        // Customer with this phone number already exists in this business
        Alert.alert(
          'Customer Already Exists',
          `A customer with phone number ${formattedPhone} already exists in your business.`,
          [
            {
              text: 'OK',
              onPress: () => {
                const customer = existingInBusinessResult.data[0] as unknown as Customer;
                selectCustomer(customer);
              }
            }
          ]
        );
        return;
      }
      
      // Then search globally for existing customers with this phone number
      const existingCustomers = await searchGlobalCustomers(formattedPhone) || [];
      
      if (existingCustomers.length > 0) {
        // Ask user if they want to use an existing customer
        Alert.alert(
          'Existing Customer Found',
          `A customer with phone ${formattedPhone} already exists in another business. Would you like to add this customer to your business?`,
          [
            {
              text: 'No, Create New',
              style: 'cancel',
              onPress: async () => {
                // Create a new customer with a unique QR code and global ID
                await createNewCustomer();
              }
            },
            {
              text: 'Yes, Use Existing',
              onPress: async () => {
                // Use the first matching customer
                const existingCustomer = existingCustomers[0];
                
                // Check if this customer already exists in this business by globalId
                const customerResult = await client.models.Customer.list({
                  filter: { 
                    and: [
                      { businessID: { eq: businessId as string } },
                      { globalId: { eq: existingCustomer.globalId } }
                    ]
                  }
                });
                
                if (customerResult.data && customerResult.data.length > 0) {
                  // Customer already exists in this business
                  Alert.alert('Info', 'This customer is already in your business');
                  const customer = customerResult.data[0] as unknown as Customer;
                  selectCustomer(customer);
                } else {
                  // Create a new customer for this business based on the existing one
                  const result = await createCustomerFromExisting(existingCustomer);
                  if (result) {
                    handleNewCustomerCreated(result, existingCustomer.firstName, existingCustomer.lastName);
                  } else {
                    Alert.alert('Error', 'Failed to add customer to this business');
                  }
                }
              }
            }
          ]
        );
        return;
      }
      
      // No existing customer found, create a new one
      await createNewCustomer();
    } catch (error: any) {
      console.error('Error in handleCreateCustomer:', error);
      Alert.alert('Error', error.message || 'Failed to create customer');
    }
  };
  
  const createNewCustomer = async () => {
    try {
      // Format phone number consistently
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Double-check one more time if a customer with this phone number already exists
      // This prevents race conditions or duplicates if the user tries to create multiple customers quickly
      const existingCheck = await client.models.Customer.list({
        filter: { 
          and: [
            { businessID: { eq: businessId as string } },
            { phoneNumber: { eq: formattedPhone } }
          ]
        }
      });
      
      if (existingCheck.data && existingCheck.data.length > 0) {
        Alert.alert(
          'Customer Already Exists',
          `A customer with phone number ${formattedPhone} already exists in your business.`,
          [
            {
              text: 'OK',
              onPress: () => {
                const customer = existingCheck.data[0] as unknown as Customer;
                selectCustomer(customer);
              }
            }
          ]
        );
        return;
      }
      
      // Generate a unique QR code and global ID for this customer
      const qrCode = generateQrCode();
      const globalId = generateGlobalId();
      
      // Create a new customer
      const result = await client.models.Customer.create({
        businessID: businessId as string,
        firstName,
        lastName,
        phoneNumber: formattedPhone,
        email: email || undefined,
        qrCode,
        globalId,
        preferredContactMethod: 'EMAIL',
        notificationPreferences: true
      });

      if (result.errors) {
        Alert.alert('Error creating customer', JSON.stringify(result.errors));
        return;
      }
      
      handleNewCustomerCreated(result.data as Customer, firstName, lastName);
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

  // Format phone number to E.164 format for storage
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
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
  
  // Format phone number for display (without +1 prefix)
  const formatPhoneNumberForDisplay = (phone: string) => {
    if (!phone) return '';
    
    // Remove the +1 prefix if it exists
    if (phone.startsWith('+1')) {
      return phone.substring(2);
    }
    // Remove just the + if it exists with another country code
    if (phone.startsWith('+')) {
      return phone.substring(1);
    }
    return phone;
  };
  
  // Find matching customers by partial phone number
  const findMatchingCustomersByPhone = (partialPhone: string) => {
    if (!partialPhone || partialPhone.length < 3) return [];
    
    const digits = partialPhone.replace(/\D/g, '');
    return customers.filter(customer => {
      const customerPhone = formatPhoneNumberForDisplay(customer.phoneNumber);
      return customerPhone.includes(digits);
    });
  };

  const selectCustomer = async (customer: Customer) => {
    const customerName = `${customer.firstName} ${customer.lastName}`;
        
    navigation.navigate('ProductSelection', {
      businessId,
      customerId: customer.id,
      customerName: customerName
    });
  };
  
  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
    const phone = customer.phoneNumber || '';
    const qrCode = customer.qrCode || '';
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || phone.includes(query) || qrCode.includes(query);
  });

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={styles.customerItem}
      onPress={() => selectCustomer(item)}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.customerPhone}>{formatPhoneNumberForDisplay(item.phoneNumber)}</Text>
        {item.email && (
          <Text style={styles.customerEmail}>{item.email}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.selectButton}>
        <Text style={styles.selectButtonText}>Select</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Helper function to handle new customer creation result
  const handleNewCustomerCreated = (customer: Customer, firstName: string, lastName: string) => {
    try {
      // Reset form and close modal
      resetForm();
      setModalVisible(false);
      setGlobalSearchResults([]);
      
      // Navigate to ProductSelection with the new customer
      navigation.navigate('ProductSelection', {
        businessId,
        customerId: customer.id,
        customerName: `${firstName} ${lastName}`
      });
    } catch (error: any) {
      console.error('Error handling new customer:', error);
      Alert.alert('Error', error.message || 'Failed to process customer');
      // Refresh customer list as fallback
      fetchCustomers();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Selection</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => navigation.navigate('BarcodeScanner', {
              onScan: handleQrCodeScanned,
              scanType: 'customer'
            })}
          >
            <Text style={styles.scanButtonText}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createButtonText}>+ New Customer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or phone"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={() => {
          // If we have matching customers and user presses Enter, select the first one
          if (filteredCustomers.length > 0) {
            selectCustomer(filteredCustomers[0]);
          } else if (searchQuery.trim() !== '') {
            // If no matches but search query exists, show create customer modal
            setModalVisible(true);
            // Pre-populate the form based on search query
            // If the search looks like a phone number, put it in the phone field
            if (/^[0-9+\-\s()]+$/.test(searchQuery)) {
              setPhoneNumber(searchQuery);
            } 
            // Otherwise, try to parse as a name
            else {
              const parts = searchQuery.trim().split(/\s+/);
              if (parts.length >= 1) setFirstName(parts[0]);
              if (parts.length >= 2) setLastName(parts.slice(1).join(' '));
            }
          }
        }}
        returnKeyType="go"
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
        onRequestClose={() => {
          resetForm();
          setModalVisible(false);
          setGlobalSearchResults([]);
        }}
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
              placeholder="Phone Number * (without +1)"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                
                // Find matching customers as user types
                const matchingCustomers = findMatchingCustomersByPhone(text);
                if (matchingCustomers.length > 0 && text.length >= 3) {
                  setGlobalSearchResults(matchingCustomers);
                } else {
                  // If phone number is at least 10 digits, search globally
                  if (text.replace(/\D/g, '').length >= 10) {
                    searchGlobalCustomers(text);
                  }
                }
              }}
              keyboardType="phone-pad"
            />
            
            {/* Show matching customers from this business as user types */}
            {globalSearchResults.length > 0 && phoneNumber.length >= 3 && (
              <View style={styles.matchingCustomersContainer}>
                <Text style={styles.matchingCustomersTitle}>Matching Customers:</Text>
                {globalSearchResults.slice(0, 3).map((customer, index) => (
                  <TouchableOpacity 
                    key={customer.id} 
                    style={styles.matchingCustomerItem}
                    onPress={() => {
                      // Auto-fill the form with this customer's data
                      setFirstName(customer.firstName);
                      setLastName(customer.lastName);
                      setPhoneNumber(formatPhoneNumberForDisplay(customer.phoneNumber));
                      setEmail(customer.email || '');
                      
                      // If customer is from this business, offer to select them
                      if (customer.businessID === businessId) {
                        Alert.alert(
                          'Existing Customer',
                          'This customer already exists in your business. Would you like to select them?',
                          [
                            { text: 'No, Continue Editing', style: 'cancel' },
                            { 
                              text: 'Yes, Select', 
                              onPress: () => {
                                resetForm();
                                setModalVisible(false);
                                setGlobalSearchResults([]);
                                selectCustomer(customer);
                              }
                            }
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={styles.matchingCustomerName}>
                      {customer.firstName} {customer.lastName} - {formatPhoneNumberForDisplay(customer.phoneNumber)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <TextInput
              style={styles.input}
              placeholder="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            {/* Show global search results if any */}
            {searchingGlobally && (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.searchingText}>Searching for existing customers...</Text>
              </View>
            )}
            
            {globalSearchResults.length > 0 && (
              <View style={styles.globalResultsContainer}>
                <Text style={styles.globalResultsTitle}>Existing Customers Found</Text>
                <Text style={styles.globalResultsSubtitle}>These customers already exist in the system</Text>
                
                {globalSearchResults.map((profile) => (
                  <TouchableOpacity 
                    key={profile.id}
                    style={styles.globalResultItem}
                    onPress={async () => {
                      // Check if this customer already exists in this business
                      const customerResult = await client.models.Customer.list({
                        filter: { 
                          and: [
                            { businessID: { eq: businessId as string } },
                            { globalId: { eq: profile.globalId } }
                          ]
                        }
                      });
                      
                      if (customerResult.data && customerResult.data.length > 0) {
                        // Customer already exists in this business
                        Alert.alert('Info', 'This customer is already in your business');
                        const customer = customerResult.data[0] as Customer;
                        resetForm();
                        setModalVisible(false);
                        selectCustomer(customer);
                      } else {
                        // Create a new customer for this business based on the existing one
                        const newCustomer = await createCustomerFromExisting(profile);
                        if (newCustomer) {
                          handleNewCustomerCreated(newCustomer, profile.firstName, profile.lastName);
                        } else {
                          Alert.alert('Error', 'Failed to add customer to this business');
                        }
                      }
                    }}
                  >
                    <Text style={styles.globalResultName}>{profile.firstName} {profile.lastName}</Text>
                    <Text style={styles.globalResultPhone}>{profile.phoneNumber}</Text>
                    {profile.email && <Text style={styles.globalResultEmail}>{profile.email}</Text>}
                    <Text style={styles.useExistingText}>Tap to use this customer</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                  setGlobalSearchResults([]);
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
  headerButtons: {
    flexDirection: 'row',
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  scanButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
    marginTop: 20,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  searchingText: {
    marginLeft: 10,
    color: '#666',
  },
  globalResultsContainer: {
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  globalResultsTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
    color: '#2196F3',
  },
  globalResultsSubtitle: {
    fontSize: 12,
    marginBottom: 10,
    color: '#666',
  },
  globalResultItem: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  globalResultName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  globalResultPhone: {
    color: '#666',
    fontSize: 12,
  },
  globalResultEmail: {
    color: '#666',
    fontSize: 12,
  },
  useExistingText: {
    color: '#2196F3',
    marginTop: 5,
    fontStyle: 'italic',
    fontSize: 12,
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
  // New styles for matching customers
  matchingCustomersContainer: {
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  matchingCustomersTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 14,
  },
  matchingCustomerItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  matchingCustomerName: {
    fontSize: 14,
  },
});
