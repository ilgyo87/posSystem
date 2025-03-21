import React, { useState } from "react"
import { View, Text, TextInput, Button, Alert, StyleSheet, Platform, ActivityIndicator } from "react-native"
import { useAuthenticator } from "@aws-amplify/ui-react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from '../src/types';
import { v4 as uuidv4 } from 'uuid';
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'

const client = generateClient<Schema>()

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

interface BusinessCreateProps {
  onBusinessCreated?: (business: Schema['Business']['type']) => void;
  isLoading?: boolean;
}

export default function BusinessCreate({ onBusinessCreated, isLoading = false }: BusinessCreateProps) {
  const { user } = useAuthenticator()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const defaultOwnerEmail = (user as any)?.attributes?.email || ""

  const [businessName, setBusinessName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [location, setLocation] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [nameError, setNameError] = useState("") // For business name validation errors
  
  // Create refs for input fields to enable tabbing
  const businessNameRef = React.useRef<TextInput>(null)
  const phoneNumberRef = React.useRef<TextInput>(null)
  const locationRef = React.useRef<TextInput>(null)
  
  // Handle tab key press for each input field
  const handleKeyPress = (e: any, nextField: React.RefObject<TextInput> | null) => {
    // Check if the tab key was pressed
    if (e.nativeEvent.key === 'Tab') {
      // Prevent default tab behavior
      if (e.preventDefault) {
        e.preventDefault();
      }
      
      // Focus the next field
      if (nextField && nextField.current) {
        nextField.current.focus();
      }
    }
  }

  // Check if business name already exists
  const checkBusinessNameExists = async (name: string): Promise<boolean> => {
    try {
      // Query for businesses with the same name
      const result = await client.models.Business.list({
        filter: {
          name: {
            eq: name
          }
        }
      });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // If any businesses with this name exist, return true
      return result.data && result.data.length > 0;
    } catch (error) {
      console.error("Error checking business name:", error);
      return false; // On error, allow the creation to proceed
    }
  };
  
  // Validate business name as user types
  const validateBusinessName = async (name: string) => {
    setBusinessName(name);
    setNameError(""); // Clear any existing errors
    
    // Only check for uniqueness if the name is at least 3 characters
    if (name.length >= 3) {
      const exists = await checkBusinessNameExists(name);
      if (exists) {
        setNameError("This business name is already taken. Please choose another name.");
      }
    }
  };
  
  const createBusiness = async () => {
    // Clear any existing errors
    setNameError("");
    
    if (!businessName || !phoneNumber) {
      Alert.alert("Error", "Please fill out all required fields")
      return
    }
    
    // Check if business name already exists
    const nameExists = await checkBusinessNameExists(businessName);
    if (nameExists) {
      setNameError("This business name is already taken. Please choose another name.");
      return;
    }

    // Format phone number before submission
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (formattedPhone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number")
      return
    }

    setIsCreating(true)

    try {
      // Generate a unique ID for the business
      const businessId = uuidv4();
      
      // Create business object
      const newBusiness = {
        id: businessId,
        name: businessName,
        phoneNumber: formattedPhone,
        location: location || undefined
      };
      
      // Save to Amplify Data API
      const result = await client.models.Business.create(newBusiness);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      setIsCreating(false);
      
      console.log('Business created successfully, navigating to Dashboard');
      
      // IMPORTANT: First call the onBusinessCreated callback with the new business
      // This updates the parent component's state and hides the modal
      if (onBusinessCreated && result.data) {
        console.log('Calling onBusinessCreated to update parent state');
        onBusinessCreated(result.data);
        
        // Add a longer delay to ensure state updates are processed
        // This helps prevent the modal from reappearing
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Force immediate navigation to Dashboard
      // This ensures we completely reset the navigation stack
      if (navigation && navigation.reset) {
        console.log('Forcing immediate navigation to Dashboard');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard', params: { businessId: businessId, businessName: businessName } }],
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
        ref={businessNameRef}
        style={[styles.input, nameError ? styles.inputError : null]}
        placeholder="Business Name"
        value={businessName}
        onChangeText={validateBusinessName}
        returnKeyType="next"
        onSubmitEditing={() => phoneNumberRef.current?.focus()}
        blurOnSubmit={false}
        autoFocus={true}
        onKeyPress={(e) => handleKeyPress(e, phoneNumberRef)}
        textContentType="organizationName"
        accessibilityLabel="Business Name"
        autoComplete="organization"
      />
      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
      <TextInput
        ref={phoneNumberRef}
        style={styles.input}
        placeholder="Phone Number (e.g., 555-555-5555)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        returnKeyType="next"
        onSubmitEditing={() => locationRef.current?.focus()}
        blurOnSubmit={false}
        onKeyPress={(e) => handleKeyPress(e, locationRef)}
        textContentType="telephoneNumber"
        accessibilityLabel="Phone Number"
        autoComplete="tel"
      />
      <TextInput
        ref={locationRef}
        style={styles.input}
        placeholder="Location (Optional)"
        value={location}
        onChangeText={setLocation}
        returnKeyType="done"
        onSubmitEditing={createBusiness}
        onKeyPress={(e) => handleKeyPress(e, null)}
        textContentType="fullStreetAddress"
        accessibilityLabel="Location"
        autoComplete="street-address"
      />
      <Button 
        title={isCreating ? "Creating..." : "Create Business"} 
        onPress={createBusiness}
        disabled={isCreating} 
      />
      {isCreating && <ActivityIndicator style={styles.loader} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
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
    height: 50,
    borderColor: '#999',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    color: '#000',
  },
  inputError: {
    borderColor: '#ff3b30',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff3b30',
    marginTop: -10,
    marginBottom: 15,
    fontSize: 14,
  },
  loader: {
    marginTop: 20,
  },
})
