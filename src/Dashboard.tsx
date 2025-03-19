import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
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
  const { businessId, businessName } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [initializing, setInitializing] = useState(true);
  const [business, setBusiness] = useState<Schema['Business']['type'] | null>(null);

  // Initialize services and products when Dashboard loads
  useEffect(() => {
    async function initializeData() {
      try {
        // Fetch business details
        const businessResult = await client.models.Business.get({
          id: businessId as string
        });
        
        if (businessResult.errors) {
          console.error('Error fetching business:', businessResult.errors);
        } else {
          setBusiness(businessResult.data);
        }

        // Check if services already exist for this business
        const servicesResult = await client.models.Service.list({
          filter: { businessID: { eq: businessId as string } }
        });
        
        if (servicesResult.errors) {
          console.error('Error checking services:', servicesResult.errors);
        } else {
          const servicesData = servicesResult.data ?? [];
          
          // Only create default services if none exist
          if (servicesData.length === 0) {
            await createDefaultServices();
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setInitializing(false);
      }
    }
    
    initializeData();
  }, [businessId]);

  // Function to create default services
  const createDefaultServices = async () => {
    try {
      // Create default services
      for (const serviceData of defaultServices) {
        const result = await client.models.Service.create({
          ...serviceData,
          businessID: businessId as string
        });
        
        if (result.errors) {
          console.error('Error creating default service:', result.errors);
          continue;
        }
        
        // Create default products for each service
        if (result.data?.id) {
          await createDefaultProducts(result.data.id, serviceData.category);
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
  const createDefaultProducts = async (serviceId: string, category: string) => {
    try {
      // Get products from the imported defaultProducts based on category
      const productsForCategory = defaultProducts[category as keyof typeof defaultProducts] || [];
      
      // Create each product
      for (const productData of productsForCategory) {
        await client.models.Product.create({
          serviceID: serviceId,
          businessID: businessId as string,
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

  const navigateToScreen = (screenName: keyof RootStackParamList) => {
    // Type-safe navigation based on the screen
    switch (screenName) {
      case 'ServiceManagement':
      case 'ProductManagement':
      case 'EmployeeManagement':
      case 'Appointments':
      case 'Customers':
      case 'Reports':
      case 'DataExport':
      case 'Settings':
        // Use type assertion to resolve the navigation type error
        navigation.navigate(screenName as any, { businessId });
        break;
      case 'Orders':
        navigation.navigate('OrderManagement', { businessId } as any);
        break;
      case 'Dashboard':
        navigation.navigate(screenName, { businessId, businessName });
        break;
      case 'CustomerSelection':
        navigation.navigate(screenName, { businessId, businessName });
        break;
      case 'BusinessCreate':
        navigation.navigate(screenName);
        break;
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
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.businessName}>{business?.name || businessName || 'My Business'}</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
      </View>

      {/* Start Transaction Button */}
      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => navigateToScreen('CustomerSelection')}
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
              onPress={() => navigateToScreen(item.screen as keyof RootStackParamList)}
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
