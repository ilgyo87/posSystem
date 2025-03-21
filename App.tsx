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
import ServiceManagement from "./src/ServiceManagement"
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

// Use type assertion to avoid TypeScript errors
Amplify.configure(defaultConfig as any)

// Try to load the outputs file if it exists (will be available at runtime)
try {
  const outputs = require("./amplify_outputs.json")
  Amplify.configure(outputs)
} catch (e) {
  console.log("amplify_outputs.json not found, using default config")
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '90%', // Increased to allow more space for content
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
    marginBottom: 15,
    textAlign: 'center',
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
  const { user } = useAuthenticator()
  const [initialRoute] = useState<keyof RootStackParamList>('Dashboard')
  const [businessData, setBusinessData] = useState<{ id: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Loading state while checking for business data
  // Initialize showBusinessModal to false - we'll only set it to true if needed
  const [showBusinessModal, setShowBusinessModal] = useState(false)
  


  // Function to create default services
  const createDefaultServices = async (businessId: string) => {
    try {
      setIsLoading(true)
      // Create default services
      for (const serviceData of defaultServices) {
        const result = await client.models.Service.create({
          ...serviceData,
          businessID: businessId
        })
        
        if (result.errors) {
          console.error('Error creating default service:', result.errors)
          continue
        }
        
        // Create default products for each service
        if (result.data?.id) {
          await createDefaultProducts(result.data.id, serviceData.category, businessId)
        } else {
          console.error('Error: Service ID is undefined')
        }
      }
      
      console.log('Default services and products created successfully')
    } catch (error) {
      console.error('Error creating default services:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Function to create default products for a service
  const createDefaultProducts = async (serviceId: string, category: string, businessId: string) => {
    try {
      // Get products from the imported defaultProducts based on category
      const productsForCategory = defaultProducts[category as keyof typeof defaultProducts] || []
      
      // Create each product
      for (const productData of productsForCategory) {
        const result = await client.models.Product.create({
          ...productData,
          serviceID: serviceId,
          businessID: businessId,
          isActive: true // Add required field
        })
        
        if (result.errors) {
          console.error('Error creating default product:', result.errors)
        }
      }
    } catch (error) {
      console.error('Error creating default products:', error)
    }
  }

  // Function to create a new business from user attributes
  const createBusinessFromUserAttributes = async () => {
    if (!user) return;
    
    try {
      // Get business name and phone number from user attributes
      const userAttributes = (user as any).attributes || {};
      console.log('User attributes:', userAttributes);
      
      const businessName = userAttributes['custom:business_name'];
      const phoneNumber = userAttributes['phone_number'];
      
      if (!businessName) {
        console.error('No business name found in user attributes');
        return;
      }
      
      console.log('Creating business with name:', businessName, 'and phone:', phoneNumber);
      
      // Generate a unique ID for the business
      const businessId = uuidv4();
      
      // Create business object with owner field
      const newBusiness = {
        id: businessId,
        name: businessName,
        phoneNumber: phoneNumber || '',
        location: '',
        owner: user.userId,
        isActive: true
      };
      
      // Save to Amplify Data API
      const result = await client.models.Business.create(newBusiness);
      
      if (result.errors) {
        console.error('Error creating business:', result.errors);
        return;
      }
      
      console.log('Business created successfully:', result.data);
      
      // Set business data for the app
      setBusinessData({
        id: businessId,
        name: businessName
      });
      
      // Create default services for the new business
      await createDefaultServices(businessId);
      
      console.log('Business created successfully from user attributes');
    } catch (error) {
      console.error('Error creating business from user attributes:', error);
    }
  };

  useEffect(() => {
    async function checkBusiness() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        // Check for existing business
        
        // First check AsyncStorage (fast)
        const hasBusinessInStorage = await checkBusinessExistsInStorage();
        
        if (hasBusinessInStorage) {
          // Get the business data from storage
          const storedData = await getBusinessData();
          
          if (storedData.businessId && storedData.businessName) {
            // Verify business data from storage with database
            
            // Verify the business exists in the database
            try {
              const verifyResult = await client.models.Business.get({
                id: storedData.businessId
              });
              
              if (verifyResult.data) {
                // Update state with verified business data
                setBusinessData({
                  id: verifyResult.data.id,
                  name: verifyResult.data.name
                });
                
                // Ensure modal is hidden
                setShowBusinessModal(false);
                setIsLoading(false);
                return;
              } else {
                // Business doesn't exist in database, clear storage
                // Business doesn't exist in database, clear storage
                await clearBusinessData();
              }
            } catch (error) {
              console.error('Error verifying business:', error);
              // On error, continue to database check
            }
          }
        }
        
        // If not in storage or incomplete data, query the database (authoritative)
        // Check database for business data
        const result = await client.models.Business.list({
          filter: { owner: { eq: user.userId } }
        });

        if (result.data && result.data.length > 0) {
          // Business exists in database
          const business = result.data[0];
          // Business exists in database
          
          // First hide the modal to prevent any flashing
          setShowBusinessModal(false);
          
          // Then update local state with business data
          setBusinessData({
            id: business.id,
            name: business.name
          });
          
          // Save to AsyncStorage for faster future checks
          await saveBusinessData(business.id, business.name);
          await markBusinessAsCreated();
          
          // Business data saved to storage and state updated
        } else {
          // Clear any existing business data to be safe
          setBusinessData(null);
          
          // Only show modal after confirming no business exists
          setShowBusinessModal(true);
        }
      } catch (error) {
        console.error('Error checking business:', error);
        // On error, don't show the modal to be safe
        setShowBusinessModal(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkBusiness();
  }, [user])



  // Handle business creation from the modal
  const handleBusinessCreated = (business: Schema['Business']['type']) => {
    // Business created successfully
    
    // IMPORTANT: Save business data to persistent storage
    // This ensures data persists between app sessions
    saveBusinessData(business.id, business.name);
    
    // Hide the modal immediately
    setShowBusinessModal(false);
    
    // Update business data in state
    setBusinessData({
      id: business.id,
      name: business.name
    });
    
    // Complete initialization
    setIsLoading(false);
    
    // Business data saved and modal hidden
  };

  // State management is handled by the above code
  
  // DIRECT DATABASE CHECK: Query for business data when user authenticates
  useEffect(() => {
    // Only run this effect when we have a user
    if (!user) {
      console.log('🔍 No user authenticated yet, waiting...');
      return;
    }

    console.log('🔍 User authenticated, checking for business data:', user.userId);
    setIsLoading(true); // Start loading state
    
    const checkBusinessData = async () => {
      try {
        // DIRECT DATABASE QUERY - most reliable source of truth
        console.log('🔍 Querying database for businesses...');
        const result = await client.models.Business.list();
        
        if (result.errors) {
          throw new Error(`Database query error: ${result.errors[0].message}`);
        }
        
        // Log the raw result for debugging
        console.log('🔍 Database query result:', 
          result.data ? `Found ${result.data.length} businesses` : 'No data returned');
        
        if (result.data && result.data.length > 0) {
          // Business exists in database - use the first one
          const business = result.data[0];
          console.log('✅ Found business in database:', business.id, business.name);
          
          // Update app state
          setBusinessData({
            id: business.id,
            name: business.name
          });
          
          // Save to local storage for faster access next time
          await saveBusinessData(business.id, business.name);
          console.log('💾 Saved business data to local storage');
          
          // Ensure modal stays hidden
          setShowBusinessModal(false);
        } else {
          // FALLBACK: Check local storage in case database is empty but we have cached data
          // No businesses in database, checking local storage
          const { businessId, businessName } = await getBusinessData();
          
          if (businessId && businessName) {
            console.log('✅ Found business in local storage:', businessId, businessName);
            setBusinessData({
              id: businessId,
              name: businessName
            });
            setShowBusinessModal(false);
          } else {
            // No business found anywhere - show the modal
            setShowBusinessModal(true);
          }
        }
      } catch (error) {
        // Error checking for business data
        
        // FALLBACK: On error, check local storage
        try {
          const { businessId, businessName } = await getBusinessData();
          
          if (businessId && businessName) {
            // Found business in local storage fallback
            setBusinessData({
              id: businessId,
              name: businessName
            });
            setShowBusinessModal(false);
          } else {
            // Last resort - show modal if we can't find anything
            // No business found in fallback, showing modal
            setShowBusinessModal(true);
          }
        } catch (storageError) {
          // Local storage fallback failed
          setShowBusinessModal(true);
        }
      } finally {
        // Always finish loading state
        setIsLoading(false);
      }
    };
    
    // Execute the check
    checkBusinessData();
  }, [user]); // Only depends on user authentication
  
  // SIMPLIFIED MODAL VISIBILITY: Only show modal when loading is complete and showBusinessModal is true
  const shouldShowModal = showBusinessModal && !isLoading;
  
  return (
    <NavigationContainer>
      {/* Business Creation Modal - only show if shouldShowModal is true */}
      {shouldShowModal && (
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalContent}>
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Create Your Business</Text>
              <TouchableOpacity 
                style={modalStyles.closeButton}
                onPress={() => setShowBusinessModal(false)}
                accessibilityLabel="Close modal"
              >
                <Text style={modalStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={modalStyles.businessCreateContainer}>
              <BusinessCreate 
                onBusinessCreated={handleBusinessCreated} 
                isLoading={isLoading}
              />
            </View>
          </View>
        </View>
      )}

      <Stack.Navigator initialRouteName={initialRoute}>
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
        <Stack.Screen 
          name="ServiceManagement" 
          component={ServiceManagement} 
          options={{ title: "Service Management" }}
        />
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
    </NavigationContainer>
  )
}




export default function App() {
  return (
    <SafeAreaProvider>
      <Authenticator.Provider>
        <Authenticator>
          <AppContent />
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  )
}
