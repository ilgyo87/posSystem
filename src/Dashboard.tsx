import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { defaultServices, defaultProducts } from './data/defaultData';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from '../src/types';

// Initialize Amplify client
const client = generateClient<Schema>();

type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function Dashboard({ route, navigation }: DashboardScreenProps) {
  // Extract business data from route params
  const { businessId, businessName } = route.params || {};
  // Keep the useNavigation hook as a fallback, but prefer the navigation prop from props
  const navigationFallback = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Use the navigation prop if available, otherwise use the hook result
  const nav = navigation || navigationFallback;
  
  const [initializing, setInitializing] = useState(true);
  const [business, setBusiness] = useState<Schema['Business']['type'] | null>(null);
  
  // State for business selection modal
  const [businessSelectionModalVisible, setBusinessSelectionModalVisible] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<Schema['Business']['type'][]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  
  // State to track if navigation is ready
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Track if component is mounted to avoid state updates after unmount
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Check if navigation is ready
  useEffect(() => {
    if (nav) {
      setIsNavigationReady(true);
    }
  }, [nav]);

  // Initialize services and products when Dashboard loads
  useEffect(() => {
    // Load business data and initialize services
    async function loadDashboard() {
      if (!isMounted.current) return;
      
      let activeBizId = businessId;
      
      if (!activeBizId) {
        // If no businessId is provided, try to fetch the first business
        const fetchedId = await fetchFirstBusiness();
        
        if (!fetchedId || !isMounted.current) {
          // No business found or component unmounted
          if (isMounted.current) setInitializing(false);
          return;
        }
        
        activeBizId = fetchedId;
      }
      
      if (isMounted.current) {
        await initializeData(activeBizId);
      }
    }
    
    // Execute immediately - the navigation container is already initialized in App.tsx
    loadDashboard();
  }, [businessId]);

  // If no businessId is provided, fetch the first business
  async function fetchFirstBusiness() {
    try {
      // If we already have a businessId from route params, use that instead of fetching
      if (businessId) {
        console.log('Using businessId from route params:', businessId);
        
        // IMPORTANT: Notify App.tsx that we have business data
        // This is a workaround to ensure App.tsx state is in sync with Dashboard
        if (isMounted.current && isNavigationReady && nav) {
          // Use a safer approach to update params
          const updateParams = () => {
            try {
              // Cast to any to avoid TypeScript errors with _hasBusinessData
              nav.setParams({
                _hasBusinessData: true,  // Special flag to indicate business data exists
                businessId,
                businessName
              } as any);
            } catch (error) {
              console.log('Could not update navigation params:', error);
            }
          };
          
          // Try to update params
          updateParams();
        }
        
        return businessId;
      }
      
      console.log('No businessId in route params, fetching first business...');
      
      const result = await client.models.Business.list({
        limit: 1
      });
      
      console.log('Business list result:', result);
      
      if (result.errors) {
        console.error('Error fetching business:', result.errors);
      } else if (result.data && result.data.length > 0) {
        const fetchedBusiness = result.data[0];
        console.log('Found business:', fetchedBusiness.name);
        setBusiness(fetchedBusiness);
        
        // IMPORTANT: Notify App.tsx that we have business data
        if (isMounted.current && isNavigationReady && nav) {
          // Use a safer approach to update params
          const updateParams = () => {
            try {
              // Cast to any to avoid TypeScript errors with _hasBusinessData
              nav.setParams({
                _hasBusinessData: true,  // Special flag to indicate business data exists
                businessId: fetchedBusiness.id,
                businessName: fetchedBusiness.name
              } as any);
            } catch (error) {
              console.log('Could not update navigation params:', error);
            }
          };
          
          // Try to update params
          updateParams();
        }
        
        return fetchedBusiness.id;
      } else {
        // No businesses found in database
      }
    } catch (error) {
      console.error('Error fetching first business:', error);
    }
    return null;
  }
  
  async function initializeData(activeBizId: string) {
    try {
      // If we already have business data from route params, use it to initialize
      if (businessId && businessName && !business) {
        console.log('Using business data from route params to initialize');
        setBusiness({
          id: businessId,
          name: businessName,
          // Add other required fields with placeholder values
          owner: '',
          phoneNumber: '',
          location: ''
        } as unknown as Schema['Business']['type']);
      }
      
      // Still fetch the full business details to ensure we have complete data
      const businessResult = await client.models.Business.get({
        id: activeBizId
      });
      
      if (businessResult.errors) {
        console.error('Error fetching business:', businessResult.errors);
      } else if (businessResult.data) {
        console.log('Fetched complete business data:', businessResult.data.name);
        setBusiness(businessResult.data);
      }

      // Services and products are now initialized at app startup, not here
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      if (isMounted.current) {
        setInitializing(false);
      }
    }
  }

  // Function to fetch all businesses from all users
  const fetchAllBusinesses = async () => {
    setLoadingBusinesses(true);
    try {
      // No filter to get all businesses
      const result = await client.models.Business.list({
        limit: 100 // Adjust as needed
      });
      
      if (result.errors) {
        console.error('Error fetching businesses:', result.errors);
        Alert.alert('Error', 'Failed to fetch businesses');
      } else if (result.data) {
        setAllBusinesses(result.data);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      Alert.alert('Error', 'Failed to fetch businesses');
    } finally {
      setLoadingBusinesses(false);
    }
  };

  // Function to select a business and switch to it
  const selectBusiness = async (selectedBusiness: Schema['Business']['type']) => {
    try {
      // Update state
      setBusiness(selectedBusiness);
      
      // Update navigation params
      if (isMounted.current && isNavigationReady && nav && nav.setParams) {
        try {
          // Cast to any to avoid TypeScript errors with _hasBusinessData
          nav.setParams({
            _hasBusinessData: true,
            businessId: selectedBusiness.id,
            businessName: selectedBusiness.name
          } as any);
        } catch (error) {
          console.log('Could not update navigation params:', error);
        }
      }
      
      // Close modal
      setBusinessSelectionModalVisible(false);
      
      // Reload dashboard with new business
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard', params: { businessId: selectedBusiness.id, businessName: selectedBusiness.name } }],
      });
    } catch (error) {
      console.error('Error selecting business:', error);
      Alert.alert('Error', 'Failed to switch business');
    }
  };

  const menuItems = [
    { title: 'Product Management', screen: 'ProductManagement', icon: '📦' },
    { title: 'Employee Management', screen: 'EmployeeManagement', icon: '👥' },
    { title: 'Appointments', screen: 'Appointments', icon: '📅' },
    { title: 'Order Management', screen: 'OrderManagement', icon: '📋' },
    { title: 'Customers', screen: 'Customers', icon: '👤' },
    { title: 'Reports', screen: 'Reports', icon: '📊' },
    { title: 'Data Export', screen: 'DataExport', icon: '💾' },
    { title: 'Settings', screen: 'Settings', icon: '⚙️' },
  ];

  const navigateToScreen = (screenName: string) => {
    // Check if navigation is ready
    if (!isNavigationReady || !nav) {
      console.log(`Navigation not ready yet, cannot navigate to ${screenName}`);
      return;
    }
    
    try {
      // Handle specific screens with their proper types
      switch (screenName) {
        case 'ProductManagement':
          nav.navigate('ProductManagement', { businessId });
          break;
        case 'OrderManagement':
          nav.navigate('OrderManagement', { businessId });
          break;
        case 'DataExport':
          nav.navigate('DataExport', { businessId });
          break;
        case 'Dashboard':
          nav.navigate('Dashboard', { businessId });
          break;
        default:
          // Fallback for screens not yet implemented
          Alert.alert('Navigation', `Screen ${screenName} not implemented yet`);
      }
    } catch (error) {
      console.error(`Error navigating to ${screenName}:`, error);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading business data...</Text>
      </View>
    );
  }
  
  // Instead of showing the No business found message,
  // we'll show a loading indicator that will allow the App component
  // to display the business creation modal
  if (!business && !initializing) {
    // Return to the parent component to handle showing the business creation modal
    return null;
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.businessHeader}>
          <Text style={styles.businessName}>{businessName ? businessName.toUpperCase() : business?.name || 'My Business'}</Text>
          <TouchableOpacity 
            style={styles.switchBusinessButton}
            onPress={() => {
              fetchAllBusinesses();
              setBusinessSelectionModalVisible(true);
            }}
          >
            <Text style={styles.switchBusinessText}>Switch Business</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>DASHBOARD</Text>
      </View>

      {/* Start Transaction Button */}
      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => navigation.navigate('CustomerSelection', { businessId, businessName: business?.name })}
      >
        <Text style={styles.startButtonText}>Start Transaction</Text>
      </TouchableOpacity>

      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => {
          // Special handling for Order Management navigation
          if (item.title === 'Order Management') {
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  // Direct navigation to OrderManagement
                  // @ts-ignore - Force the navigation
                  navigation.navigate('OrderManagement', { businessId });
                }}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigateToScreen(item.screen as string)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Business Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={businessSelectionModalVisible}
        onRequestClose={() => setBusinessSelectionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Business</Text>
            
            {loadingBusinesses ? (
              <ActivityIndicator size="large" color="#2196F3" style={styles.modalLoading} />
            ) : (
              <>
                {allBusinesses.length === 0 ? (
                  <Text style={styles.noBusinessesText}>No businesses found</Text>
                ) : (
                  <FlatList
                    data={allBusinesses}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.businessItem,
                          business?.id === item.id && styles.selectedBusinessItem
                        ]}
                        onPress={() => selectBusiness(item)}
                      >
                        <Text style={styles.businessItemName}>{item.name}</Text>
                        {item.phoneNumber && <Text style={styles.businessItemPhone}>{item.phoneNumber}</Text>}
                        {business?.id === item.id && (
                          <Text style={styles.currentBusinessText}>Current</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    style={styles.businessList}
                  />
                )}
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setBusinessSelectionModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRefreshButton}
                onPress={fetchAllBusinesses}
              >
                <Text style={styles.modalButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e53935',
    marginBottom: 10,
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    marginBottom: 15,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  switchBusinessButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  switchBusinessText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLoading: {
    marginVertical: 20,
  },
  businessList: {
    maxHeight: 300,
  },
  businessItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  selectedBusinessItem: {
    backgroundColor: '#e3f2fd',
  },
  businessItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  businessItemPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  currentBusinessText: {
    position: 'absolute',
    right: 15,
    top: 15,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  noBusinessesText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    backgroundColor: '#757575',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  modalRefreshButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
