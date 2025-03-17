import React from "react"
import { Amplify } from "aws-amplify"
import { Authenticator } from "@aws-amplify/ui-react-native"
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import outputs from "./amplify_outputs.json"
import BusinessCreate from "./src/BusinessCreate"
import Dashboard from "./src/Dashboard"
import ServiceManagement from "./src/ServiceManagement"
import ProductManagement from "./src/ProductManagement"
import CustomerSelection from "./src/CustomerSelection"
import ProductSelectionScreen from "./src/ProductSelectionScreen"
import type { RootStackParamList } from "./src/types"

Amplify.configure(outputs)

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
            </Stack.Navigator>
          </NavigationContainer>
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  )
}
