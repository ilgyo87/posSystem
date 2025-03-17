import React, { useState } from "react"
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native"
import { useAuthenticator } from "@aws-amplify/ui-react-native"
import { generateClient } from "aws-amplify/api"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from '../src/types';

// Format phone number to E.164 format
const formatPhoneNumber = (phone: string) => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // For US numbers, format as +1XXXXXXXXXX
  if (digits.length === 10) {
    return `+1${digits}`
  }
  // If number already has country code
  if (digits.length > 10 && digits.startsWith('1')) {
    return `+${digits}`
  }
  return digits
}

export default function BusinessCreate() {
  const { user } = useAuthenticator()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const defaultOwnerEmail = (user as any)?.attributes?.email || ""

  const [businessName, setBusinessName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [location, setLocation] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const createBusiness = async () => {
    if (!businessName || !phoneNumber) {
      Alert.alert("Error", "Please fill out all required fields")
      return
    }

    // Format phone number before submission
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (formattedPhone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number")
      return
    }

    setIsCreating(true)

    try {
      // Direct GraphQL mutation instead of using client.models
      const createBusinessMutation = `mutation CreateBusiness($input: CreateBusinessInput!) {
        createBusiness(input: $input) {
          id
          name
          phoneNumber
          location
        }
      }`;

      const variables = {
        input: {
          name: businessName,
          phoneNumber: formattedPhone,
          location: location || null
        }
      };

      // Use the GraphQL API directly through fetch
      const apiEndpoint = "https://o6ewbmbljfhm5jiyb4qsrphhdu.appsync-api.us-east-1.amazonaws.com/graphql";
      
      // Get the current authenticated user's token
      const token = (user as any).signInUserSession.idToken.jwtToken;
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          query: createBusinessMutation,
          variables: variables
        })
      });
      
      const result = await response.json();
      
      setIsCreating(false);
      
      if (result.errors) {
        Alert.alert("Error creating business", JSON.stringify(result.errors));
      } else if (!result.data || !result.data.createBusiness) {
        Alert.alert("Error", "Failed to create business: No data returned");
      } else {
        // Navigate to Dashboard with business info
        navigation.navigate("Dashboard", { 
          businessId: result.data.createBusiness.id,
          businessName: result.data.createBusiness.name
        });
      }
    } catch (error: any) {
      setIsCreating(false);
      console.error("Create business error:", error);
      Alert.alert("Error", error.message || "Failed to create business");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a New Business</Text>
      <TextInput
        style={styles.input}
        placeholder="Business Name"
        value={businessName}
        onChangeText={setBusinessName}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g., 555-555-5555)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Location (Optional)"
        value={location}
        onChangeText={setLocation}
      />
      <Button 
        title={isCreating ? "Creating..." : "Create Business"} 
        onPress={createBusiness}
        disabled={isCreating} 
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
})
