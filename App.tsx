import React, { useEffect, useState } from "react"
import { TouchableOpacity, Text, StyleSheet, View, Button } from "react-native"
import { Amplify } from "aws-amplify"
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react-native"
import { signOut } from "aws-amplify/auth"
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from './amplify/data/resource'
import { defaultServices, defaultProducts } from './src/data/defaultData'
import { v4 as uuidv4 } from 'uuid'

// Import all screens directly from src directory
import BusinessCreate from "./src/BusinessCreate"
import Dashboard from "./src/Dashboard"
// ServiceManagement removed - functionality now in ProductManagement
import ProductManagement from "./src/ProductManagement"
import CustomerSelection from "./src/CustomerSelection"
import ProductSelectionScreen from "./src/ProductSelectionScreen"
import CheckoutScreen from "./src/CheckoutScreen"
import DataExportScreen from "./src/DataExportScreen"

// Order management screens
import OrderManagement from "./src/OrderManagement"
import OrderDetails from "./src/OrderDetails"
import BarcodeScanner from "./src/BarcodeScanner"
import RackAssignment from "./src/RackAssignment"
import CompletedOrderDetails from "./src/CompletedOrderDetails"

// Import the BusinessCreationModal component
import BusinessCreationModal from "./src/BusinessCreationModal"

import type { RootStackParamList } from "./src/types"

// Import our AsyncStorage utilities
import { 
  saveBusinessData, 
  getBusinessData, 
  hasCreatedBusiness,
  checkBusinessExistsInStorage,
  markBusinessAsCreated,
  clearBusinessData 
} from "./src/utils/storage"

// Initialize Amplify client
const client = generateClient<Schema>();

// Configure Amplify with hardcoded values for build process
// These will be overridden by amplify_outputs.json in the actual app
const defaultConfig = {
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_EFn32fp7l",
      userPoolClientId: "1uarskdusecvvgh9j1ha3e6bt8",
      loginWith: {
        email: true
      }
    }
  },
  API: {
    GraphQL: {
      endpoint: "https://o6ewbmbljfhm5jiyb4qsrphhdu.appsync-api.us-east-1.amazonaws.com/graphql",
      region: "us-east-1",
      defaultAuthMode: "userPool"
    }
  }
}

// Create console.log wrapper that includes timestamps
const logger = {
  log: (...args: any[]) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(`[${timestamp}]`, ...args);
  },
  error: (...args: any[]) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.error(`[${timestamp}]`, ...args);
  }
};

// Use type assertion to avoid TypeScript errors
logger.log('Configuring Amplify with default config...');
Amplify.configure(defaultConfig as any);

// Try to load the outputs file if it exists (will be available at runtime)
try {
  const outputs = require("./amplify_outputs.json");
  logger.log('Found amplify_outputs.json, configuring Amplify with file...');
  Amplify.configure(outputs);
} catch (e) {
  logger.log("amplify_outputs.json not found, using default config");
}

// Create the stack navigator with explicit type
const Stack = createNativeStackNavigator<RootStackParamList>()

// Define styles for the modal
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
})

// Modal styles for business creation modal
const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 5, // Add shadow on Android
    shadowColor: '#000', // Shadow properties for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
    width: '100%',
  },
  businessCreateContainer: {
    width: '100%',
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#555'
  }
});

// Custom SignOutButton component that can be used in the header
const SignOutButton = () => {
  const { signOut } = useAuthenticator();
  return (
    <TouchableOpacity 
      onPress={signOut}
      style={{ padding: 8 }}
    >
      <Text style={{ color: '#007AFF', fontSize: 16 }}>Sign Out</Text>
    </TouchableOpacity>
  );
};

function AppContent() {
  const { user, authStatus } = useAuthenticator();
  const [initialRoute] = useState<keyof RootStackParamList>('Dashboard');
  const [businessData, setBusinessData] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  
  // Effect to check for business data when component mounts
  useEffect(() => {
    // We're already authenticated at this point (checked in AppWithAuth)
    if (user) {
      checkForBusiness();
    }
  }, [user]);
  
  // Separate function to check for business
  const checkForBusiness = async () => {
    console.log('Checking for business data...');
    setIsLoading(true);
    
    try {
      // First try to get from storage
      const storageData = await getBusinessData();
      if (storageData.businessId && storageData.businessName) {
        console.log('Found business in storage:', storageData.businessId);
        
        try {
          const verifyResult = await client.models.Business.get({
            id: storageData.businessId
          });
          
          if (verifyResult.data) {
            if (verifyResult.data.owner === user.username) {
              console.log('Business verified, belongs to current user');
              setBusinessData({
                id: storageData.businessId,
                name: storageData.businessName
              });
              
              await checkAndInitializeServices(storageData.businessId);
              setShowBusinessModal(false);
              setIsLoading(false);
              return;
            } else {
              console.log('Business found but belongs to different user');
              await clearBusinessData();
            }
          } else {
            console.log('Business not found in database');
            await clearBusinessData();
          }
        } catch (error) {
          console.error('Error verifying business:', error);
          // Continue to check database directly
        }
      }
      
      // Then try to find user's businesses
      try {
        console.log('Checking for businesses owned by user:', user.username);
        const result = await client.models.Business.list({
          filter: {
            owner: { eq: user.username }
          }
        });
        
        if (result.data && result.data.length > 0) {
          const business = result.data[0];
          console.log('Found business owned by user:', business.name);
          
          setBusinessData({
            id: business.id,
            name: business.name
          });
          
          await saveBusinessData(business.id, business.name);
          await checkAndInitializeServices(business.id);
          setShowBusinessModal(false);
        } else {
          console.log('No businesses found for user, showing creation modal');
          setShowBusinessModal(true);
        }
      } catch (error) {
        console.error('Error checking for business:', error);
        setShowBusinessModal(true);
      }
    } catch (error) {
      console.error('Error in checkForBusiness:', error);
      setShowBusinessModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check for existing services and initialize if needed
  const checkAndInitializeServices = async (businessId: string) => {
    try {
      // Check if services already exist for this business
      const servicesResult = await client.models.Service.list({
        filter: { businessID: { eq: businessId } }
      });
      
      if (servicesResult.errors) {
        console.error('Error checking services:', servicesResult.errors);
        return;
      }
      
      // If no services exist, create the default ones
      if (!servicesResult.data || servicesResult.data.length === 0) {
        await createDefaultServices(businessId);
      }
    } catch (error: any) {
      console.error('Error checking for services:', error);
    }
  };
  
  // Function to create default services
  const createDefaultServices = async (businessId: string) => {
    try {
      setIsLoading(true);
      // Create default services
      for (const serviceData of defaultServices) {
        // Create a new object without the category field
        const { category, ...serviceDataWithoutCategory } = serviceData;
        
        const result = await client.models.Service.create({
          ...serviceDataWithoutCategory,
          businessID: businessId
        });
        
        if (result.errors) {
          console.error('Error creating default service:', result.errors);
          continue;
        }
        
        // Create default products for each service
        if (result.data?.id) {
          await createDefaultProducts(result.data.id, category, businessId);
        } else {
          console.error('Error: Service ID is undefined');
        }
      }
      
      console.log('Default services and products created successfully');
    } catch (error: any) {
      console.error('Error creating default services:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to create default products for a service
  const createDefaultProducts = async (serviceId: string, category: string, businessId: string) => {
    try {
      // Get products from the imported defaultProducts based on category
      const productsForCategory = defaultProducts[category as keyof typeof defaultProducts] || [];
      
      // Create each product
      for (const productData of productsForCategory) {
        const result = await client.models.Product.create({
          ...productData,
          serviceID: serviceId,
          businessID: businessId
        });
        
        if (result.errors) {
          console.error('Error creating default product:', result.errors);
        }
      }
    } catch (error: any) {
      console.error('Error creating default products:', error);
    }
  };

  // Function to create a business from the modal
  const handleBusinessCreated = async (business: Schema['Business']['type']) => {
    console.log('Business created:', business.id, business.name);
    
    // Set business data for the app
    setBusinessData({
      id: business.id,
      name: business.name
    });
    
    try {
      // Save business to storage
      await saveBusinessData(business.id, business.name);
      console.log('Business data saved to storage');
      
      // Mark as created
      await markBusinessAsCreated();
      console.log('Business marked as created');
      
      // Check and initialize default services
      await checkAndInitializeServices(business.id);
      console.log('Services checked/initialized');
      
      // IMPORTANT: Set this flag to false to prevent showing the business creation screen again
      setShowBusinessModal(false);
      
      // Force a refresh of the business check to ensure we don't show the modal again
      await checkForBusiness();
    } catch (error) {
      console.error('Error in business creation process:', error);
    }
  };
  
  // Show loading indicator
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  return (
    <>

      <Stack.Navigator
        key={`nav-${showBusinessModal}-${businessData?.id || 'none'}`}
        initialRouteName={showBusinessModal ? 'BusinessCreate' : 'Dashboard'}
      >
          <Stack.Screen 
            name="BusinessCreate" 
            options={{
              title: "Create Your Business",
              headerShown: false,
              gestureEnabled: false
            }}
          >
            {props => (
              <View style={modalStyles.modalContainer}>
                <View style={modalStyles.modalContent}>
                  <View style={modalStyles.modalHeader}>
                    <Text style={modalStyles.modalTitle}>Create Your Business</Text>
                  </View>
                  <Text style={modalStyles.modalText}>
                    Please create a business to continue using the app
                  </Text>
                  <BusinessCreate 
                    onBusinessCreated={handleBusinessCreated} 
                    isLoading={isLoading}
                  />
                </View>
              </View>
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="Dashboard" 
            component={Dashboard} 
            options={({ route }) => ({
              title: businessData?.name || route.params?.businessName || "Dashboard",
              headerBackVisible: false,
              // Use our custom SignOutButton component
              headerRight: () => <SignOutButton />
            })}
            initialParams={{ 
              businessId: businessData?.id,
              businessName: businessData?.name 
            }}
          />
        {/* ServiceManagement screen removed - functionality now in ProductManagement */}
        <Stack.Screen 
          name="ProductManagement" 
          component={ProductManagement} 
          options={{ title: "Product Management" }}
        />
        <Stack.Screen 
          name="CustomerSelection" 
          component={CustomerSelection} 
          options={({ navigation, route }) => ({
            title: "Select Customer",
            headerLeft: () => {
              const { businessId } = route.params as { businessId: string };
              return (
                <TouchableOpacity 
                  onPress={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard', params: { businessId } }],
                  })}
                  style={{ marginLeft: 10 }}
                >
                  <Text style={{ color: '#2196F3', fontSize: 16, fontWeight: 'bold' }}>Dashboard</Text>
                </TouchableOpacity>
              );
            }
          })}
        />
        <Stack.Screen 
          name="ProductSelection" 
          component={ProductSelectionScreen} 
          options={{ title: "Select Products" }}
        />
        <Stack.Screen 
          name="Checkout" 
          component={CheckoutScreen} 
          options={{ title: "Checkout" }}
        />
        <Stack.Screen 
          name="DataExport" 
          component={DataExportScreen} 
          options={{ title: "Data Export" }}
        />
        <Stack.Screen 
          name="OrderManagement" 
          component={OrderManagement} 
          options={({ navigation, route }) => ({
            title: "Order Management",
            headerLeft: () => {
              const { businessId } = route.params as { businessId: string };
              return (
                <TouchableOpacity 
                  onPress={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard', params: { businessId } }],
                  })}
                  style={{ marginLeft: 10 }}
                >
                  <Text style={{ color: '#2196F3', fontSize: 16, fontWeight: 'bold' }}>Dashboard</Text>
                </TouchableOpacity>
              );
            }
          })}
        />
        <Stack.Screen 
          name="OrderDetails" 
          component={OrderDetails} 
          options={{ title: "Order Details" }}
        />
        <Stack.Screen 
          name="BarcodeScanner" 
          component={BarcodeScanner} 
          options={{ title: "Scan Barcode" }}
        />
        <Stack.Screen 
          name="RackAssignment" 
          component={RackAssignment} 
          options={{ title: "Rack Assignment" }}
        />
        <Stack.Screen 
          name="CompletedOrderDetails" 
          component={CompletedOrderDetails} 
          options={{ title: "Completed Order" }}
        />
      </Stack.Navigator>
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Authenticator.Provider>
          <AppWithAuth />
        </Authenticator.Provider>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

function AppWithAuth() {
  const { user, authStatus } = useAuthenticator();
  
  // If not authenticated, show the login screen
  if (authStatus !== 'authenticated') {
    return (
      <Authenticator
        signUpAttributes={['email']}
      />
    );
  }
  
  // If authenticated, show the app content
  return <AppContent />;
}

