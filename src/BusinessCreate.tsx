import React, { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform, ActivityIndicator, Modal } from "react-native"
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
  const [modalVisible, setModalVisible] = useState(true) // Modal is always visible in this component
  
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

  // Check if business name and phone number combination already exists
  const checkBusinessExists = async (name: string, phone: string): Promise<boolean> => {
    if (!name || !phone) return false;
    
    try {
      // Format phone number for consistent comparison
      const formattedPhone = formatPhoneNumber(phone);
      
      // Check if we have authentication
      if (!user || !user.username) {
        console.log('User not authenticated, skipping global check');
        return false; // Skip the check if not authenticated
      }
      
      // Use try-catch with fallback approach
      try {
        console.log('Attempting to check for existing business...');
        // First try with explicit user pool auth mode
        const result = await client.models.Business.list({
          filter: {
            name: { eq: name.trim() },
            phoneNumber: { eq: formattedPhone }
          },
          authMode: "userPool"
        });
        
        console.log('Check complete, found matches:', result.data?.length || 0);
        return result.data && result.data.length > 0;
      } catch (innerError) {
        // If we get auth error, try without specifying authMode
        if (innerError instanceof Error && innerError.message.includes('No current user')) {
          console.log('Auth error, trying without explicit authMode...');
          const fallbackResult = await client.models.Business.list({
            filter: {
              name: { eq: name.trim() },
              phoneNumber: { eq: formattedPhone }
            }
          });
          
          return fallbackResult.data && fallbackResult.data.length > 0;
        }
        throw innerError; // Re-throw if it's not an auth error
      }
    } catch (error) {
      console.error("Error checking business existence:", error);
      
      // For NoSignedUser errors, we'll assume no duplicate exists
      if (error instanceof Error && 
         (error.message.includes('No current user') || 
          error.message.includes('NoSignedUser'))) {
        console.log('Authentication error occurred, proceeding with creation');
        return false;
      }
      
      // For other errors, we'll show an error but still allow creation
      console.warn('Non-auth error occurred during check:', error);
      return false;
    }
  };
  
  // Validate business name and phone number combination
  const validateBusiness = async (name: string, phone: string) => {
    if (name.length >= 3 && phone.length >= 10) {
      const exists = await checkBusinessExists(name, phone);
      if (exists) {
        setNameError("A business with this name and phone number already exists. Please use different information.");
        return false;
      }
      setNameError("");
      return true;
    }
    return true; // Don't show error if fields are not complete yet
  };
  
  // Update the validateBusinessName function to also check phone number if available
  const validateBusinessName = async (name: string) => {
    setBusinessName(name);
    setNameError(""); // Clear any existing errors
    
    if (name.length >= 3 && phoneNumber.length >= 10) {
      await validateBusiness(name, phoneNumber);
    }
  };
  
  // Add phone number validation
  const handlePhoneNumberChange = async (phone: string) => {
    setPhoneNumber(phone);
    
    if (businessName.length >= 3 && phone.length >= 10) {
      await validateBusiness(businessName, phone);
    }
  };

  const createBusiness = async () => {
    // Clear any existing errors
    setNameError("");
    
    if (!businessName || !phoneNumber) {
      Alert.alert("Error", "Please fill out all required fields")
      return
    }
    
    // Make sure we have an authenticated user
    if (!user || !user.username) {
      Alert.alert("Authentication Error", "You must be signed in to create a business. Please sign in and try again.");
      return;
    }
    
    // Format phone number before submission
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (formattedPhone.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number")
      return
    }
    
    // Best-effort check for existing businesses
    let exists = false;
    try {
      exists = await checkBusinessExists(businessName, formattedPhone);
    } catch (error) {
      console.warn('Error during existence check, proceeding anyway:', error);
      // We'll proceed with creation even if the check fails
    }
    
    if (exists) {
      setNameError("A business with this name and phone number already exists. Please use different information.");
      return;
    }

    setIsCreating(true)

    try {
      // Generate a unique ID for the business
      const businessId = uuidv4();
      
      // Create business with owner field
      const newBusiness = {
        id: businessId,
        name: businessName,
        phoneNumber: formattedPhone,
        location: location || undefined,
        owner: user.username // Set owner to current user's username
      };
      
      console.log("Creating business with ID:", businessId, "for owner:", user.username);
      
      // Create the business - try different auth approaches if needed
      let result;
      try {
        // First try with explicit userPool auth
        result = await client.models.Business.create(newBusiness, {
          authMode: "userPool"
        });
      } catch (authError) {
        // If that fails, try without specifying auth mode
        if (authError instanceof Error && authError.message.includes('No current user')) {
          console.log('Auth error during creation, trying without explicit authMode...');
          result = await client.models.Business.create(newBusiness);
        } else {
          throw authError; // Re-throw if it's not an auth error
        }
      }
      
      if (result && result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      setIsCreating(false);
      
      console.log('Business created successfully');
      
      // Call the callback to update parent state
      if (onBusinessCreated && result && result.data) {
        console.log('Calling onBusinessCreated with new business');
        onBusinessCreated(result.data);
        
        // Add delay to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Navigate to Dashboard
      if (navigation && navigation.reset) {
        console.log('Navigating to Dashboard');
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

  // Reset form function similar to customer creation
  const resetForm = () => {
    setBusinessName("");
    setPhoneNumber("");
    setLocation("");
    setNameError("");
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        // This would typically close the modal, but in this case we keep it open
        // as it's the main component
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Business</Text>
          
          <TextInput
            ref={businessNameRef}
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="Business Name *"
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
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="Phone Number * (e.g., 555-555-5555)"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
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
          
          {isCreating && <ActivityIndicator style={styles.loader} color="#2196F3" />}
          
          <View style={styles.modalButtons}>
            {/* Cancel button is not functional in this context since we need to create a business */}
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={createBusiness}
              disabled={isCreating}
            >
              <Text style={styles.saveButtonText}>{isCreating ? "Creating..." : "Create"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'center',
  },
})
