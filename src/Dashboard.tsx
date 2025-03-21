import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { saveBusinessData, getBusinessData, hasCreatedBusinessSync } from './utils/storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { defaultServices, defaultProducts } from './data/defaultData';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from '../src/types';

// Initialize Amplify client
const client = generateClient<Schema>();

type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function Dashboard({ route }: DashboardScreenProps) {
  // Extract business data from route params
  const { businessId, businessName } = route.params || {};
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [initializing, setInitializing] = useState(true);
  const [business, setBusiness] = useState<Schema['Business']['type'] | null>(null);
  
  // Log the business data from route params for debugging
  // Dashboard initialized with business data from route params

  // Initialize services and products when Dashboard loads
  useEffect(() => {
    // First check if we have business data in AsyncStorage
    const loadBusinessData = async (): Promise<boolean> => {
      try {
        const { businessId: storedBusinessId, businessName: storedBusinessName } = await getBusinessData();
        
        if (storedBusinessId && storedBusinessName) {
          console.log('Using business data from storage:', {
            businessId: storedBusinessId,
            businessName: storedBusinessName
          });
          
          // Set business with required fields
          // TypeScript requires all fields, but we only need id and name for now
          setBusiness({
            id: storedBusinessId,
            name: storedBusinessName
          } as Schema['Business']['type']);
          
          setInitializing(false);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error loading business data from storage:', error);
        return false;
      }
    };
    
    // Use void to indicate we don't care about the return value in this chain
    void loadBusinessData().then(foundInStorage => {
      if (foundInStorage) return;
      
      // Continue with other initialization if not found in storage
      void fetchFirstBusiness();
    });
    
    // If no businessId is provided, fetch the first business
    async function fetchFirstBusiness() {
      try {
        // If we already have a businessId from route params, use that instead of fetching
        if (businessId) {
          console.log('Using businessId from route params:', businessId);
          
          // IMPORTANT: Save business data to persistent storage
          if (businessId && businessName) {
            saveBusinessData(businessId, businessName).catch(error => {
              console.error('Error saving business data:', error);
            });
          }
          
          // IMPORTANT: Notify App.tsx that we have business data
          // This is a workaround to ensure App.tsx state is in sync with Dashboard
          if (navigation && navigation.setParams) {
            navigation.setParams({
              _hasBusinessData: true,  // Special flag to indicate business data exists
              businessId,
              businessName
            });
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
          if (navigation && navigation.setParams) {
            navigation.setParams({
              _hasBusinessData: true,  // Special flag to indicate business data exists
              businessId: fetchedBusiness.id,
              businessName: fetchedBusiness.name
            });
          }
          
          return fetchedBusiness.id;
        } else {
          // No businesses found in database
        }
      } catch (error) {
        // Error fetching first business
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
          } as Schema['Business']['type']);
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

        // Check if services already exist for this business
        const servicesResult = await client.models.Service.list({
          filter: { businessID: { eq: activeBizId } }
        });
        
        if (servicesResult.errors) {
          console.error('Error checking services:', servicesResult.errors);
        } else {
          const servicesData = servicesResult.data ?? [];
          
          // Only create default services if none exist
          if (servicesData.length === 0) {
            await createDefaultServices(activeBizId);
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setInitializing(false);
      }
    }
    
    async function loadDashboard() {
      let activeBizId = businessId;
      
      if (!activeBizId) {
        // If no businessId is provided, try to fetch the first business
        const fetchedId = await fetchFirstBusiness();
        
        if (!fetchedId) {
          // No business found
          setInitializing(false);
          return;
        }
        
        activeBizId = fetchedId;
      }
      
      await initializeData(activeBizId);
    }
    
    loadDashboard();
  }, [businessId]);

  // Function to create default services
  const createDefaultServices = async (bizId: string) => {
    try {
      // Create default services
      for (const serviceData of defaultServices) {
        const result = await client.models.Service.create({
          ...serviceData,
          businessID: bizId
        });
        
        if (result.errors) {
          console.error('Error creating default service:', result.errors);
          continue;
        }
        
        // Create default products for each service
        if (result.data?.id) {
          await createDefaultProducts(result.data.id, serviceData.category, bizId);
        } else {
          console.error('Error: Service ID is undefined');
        }
      }
      
      console.log('Default services and products created successfully');
    } catch (error) {
      console.error('Error creating default services:', error);
    }
  };
  
  // Function to create default products for a service
  const createDefaultProducts = async (serviceId: string, category: string, bizId: string) => {
    try {
      // Get products from the imported defaultProducts based on category
      const productsForCategory = defaultProducts[category as keyof typeof defaultProducts] || [];
      
      // Create each product
      for (const productData of productsForCategory) {
        await client.models.Product.create({
          serviceID: serviceId,
          businessID: bizId,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          imageUrl: productData.imageUrl,
          inventory: 999, // Large inventory for services
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error creating default products:', error);
    }
  };

  const menuItems = [
    { title: 'Service Management', screen: 'ServiceManagement', icon: '🧹' },
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
    // Handle specific screens with their proper types
    switch (screenName) {
      case 'ServiceManagement':
        navigation.navigate('ServiceManagement', { businessId });
        break;
      case 'ProductManagement':
        navigation.navigate('ProductManagement', { businessId });
        break;
      case 'OrderManagement':
        navigation.navigate('OrderManagement', { businessId });
        break;
      case 'DataExport':
        navigation.navigate('DataExport', { businessId });
        break;
      case 'Dashboard':
        navigation.navigate('Dashboard', { businessId });
        break;
      default:
        // Fallback for screens not yet implemented
        Alert.alert('Navigation', `Screen ${screenName} not implemented yet`);
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
        <Text style={styles.businessName}>{business?.name || businessName || 'My Business'}</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
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
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
});
