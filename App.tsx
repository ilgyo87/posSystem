import React from "react"
import { Amplify } from "aws-amplify"
import { Authenticator } from "@aws-amplify/ui-react-native"
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import BusinessCreate from "./src/BusinessCreate"
import Dashboard from "./src/Dashboard"
import ServiceManagement from "./src/ServiceManagement"
import ProductManagement from "./src/ProductManagement"
import CustomerSelection from "./src/CustomerSelection"
import ProductSelectionScreen from "./src/ProductSelectionScreen"
import CheckoutScreen from "./src/CheckoutScreen"
import DataExportScreen from "./src/DataExportScreen"
import type { RootStackParamList } from "./src/types"

// Configure Amplify with hardcoded values for build process
// These will be overridden by amplify_outputs.json in the actual app
const defaultConfig = {
  aws_project_region: "us-east-1",
  aws_user_pools_id: "us-east-1_EFn32fp7l",
  aws_user_pools_web_client_id: "1uarskdusecvvgh9j1ha3e6bt8",
  aws_appsync_graphqlEndpoint: "https://example.com/graphql",
  aws_appsync_region: "us-east-1",
  aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS"
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

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
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
            </Stack.Navigator>
          </NavigationContainer>
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  )
}
