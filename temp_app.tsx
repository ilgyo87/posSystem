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

const Stack = createNativeStackNavigator<RootStackParamList>()

function App() {
  return (
    <SafeAreaProvider>
      <Authenticator.Provider>
        <Authenticator
          Container={(props) => (
            <View style={{ flex: 1, paddingTop: 20 }}>
              {props.children}
            </View>
          )}
        >
          <NavigationContainer>
            <Stack.Navigator initialRouteName="BusinessCreate">
              <Stack.Screen 
                name="BusinessCreate" 
                component={BusinessCreate} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Dashboard" 
                component={Dashboard} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="ServiceManagement" 
                component={ServiceManagement} 
                options={{ title: "Manage Services" }}
              />
              <Stack.Screen 
                name="ProductManagement" 
                component={ProductManagement} 
                options={{ title: "Manage Products" }}
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
                options={{ title: "Export Data" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  )
}

export default App
