import AsyncStorage from '@react-native-async-storage/async-storage';

// Business data helpers
export const saveBusinessData = async (businessId: string, businessName: string) => {
  if (!businessId) return;
  
  try {
    // Save business data
    await AsyncStorage.setItem('businessId', businessId);
    await AsyncStorage.setItem('businessName', businessName);
    
    // Set a flag to indicate that a business has been created
    await AsyncStorage.setItem('hasCreatedBusiness', 'true');
    
    console.log('Business data saved to AsyncStorage:', { businessId, businessName });
  } catch (error) {
    console.error('Error saving business data:', error);
  }
};

export const getBusinessData = async () => {
  try {
    const businessId = await AsyncStorage.getItem('businessId');
    const businessName = await AsyncStorage.getItem('businessName');
    const hasCreatedBusiness = await AsyncStorage.getItem('hasCreatedBusiness') === 'true';
    
    return {
      businessId,
      businessName,
      hasCreatedBusiness
    };
  } catch (error) {
    console.error('Error getting business data:', error);
    return {
      businessId: null,
      businessName: null,
      hasCreatedBusiness: false
    };
  }
};

// New function to explicitly mark that a business exists
export const markBusinessAsCreated = async () => {
  try {
    await AsyncStorage.setItem('hasCreatedBusiness', 'true');
    console.log('Business marked as created in AsyncStorage');
    return true;
  } catch (error) {
    console.error('Error marking business as created:', error);
    return false;
  }
};

// New function to check if business exists in AsyncStorage
export const checkBusinessExistsInStorage = async (): Promise<boolean> => {
  try {
    const hasCreatedBusiness = await AsyncStorage.getItem('hasCreatedBusiness');
    return hasCreatedBusiness === 'true';
  } catch (error) {
    console.error('Error checking if business exists in storage:', error);
    return false;
  }
};

// Clear business data (for testing or logout)
export const clearBusinessData = async () => {
  try {
    await AsyncStorage.multiRemove(['businessId', 'businessName', 'hasCreatedBusiness']);
    console.log('Business data cleared from AsyncStorage');
  } catch (error) {
    console.error('Error clearing business data:', error);
  }
};

// Check if a business has been created
export const hasCreatedBusiness = async () => {
  try {
    return await AsyncStorage.getItem('hasCreatedBusiness') === 'true';
  } catch (error) {
    console.error('Error checking if business has been created:', error);
    return false;
  }
};

// Declare the global type for TypeScript
declare global {
  var __hasCreatedBusiness: boolean;
}

// Synchronous version for immediate checks (returns cached value or false)
export const hasCreatedBusinessSync = () => {
  // This is a simplified version that doesn't actually check AsyncStorage
  // but is useful for synchronous checks in render functions
  return global.__hasCreatedBusiness === true;
};

// Initialize the global cache
global.__hasCreatedBusiness = false;

// Load the business created flag into memory on import
(async () => {
  try {
    global.__hasCreatedBusiness = await hasCreatedBusiness();
  } catch (error) {
    console.error('Error initializing business created flag:', error);
  }
})();
