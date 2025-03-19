import React from "react"
import { Amplify } from "aws-amplify"
import { Authenticator } from "@aws-amplify/ui-react-native"
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'

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

import type { RootStackParamList } from "./src/types"

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

export default function App() {
  // Console log to verify app is loading properly
  console.log('App initializing')
  
  return (
    <SafeAreaProvider>
      <Authenticator.Provider>
        <Authenticator>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="BusinessCreate">
              <Stack.Screen 
                name="BusinessCreate" 
                component={BusinessCreate} 
                options={{ title: "Create Business" }}
              />
              <Stack.Screen 
                name="Dashboard" 
                component={Dashboard} 
                options={({ route }) => ({ 
                  title: route.params?.businessName || "Dashboard",
                  headerBackVisible: false // Prevent going back to business creation
                })}
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
                options={{ title: "Select Customer" }}
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
                options={{ title: "Order Management" }}
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
            </Stack.Navigator>
          </NavigationContainer>
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  )
}
