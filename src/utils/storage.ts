// Mock storage implementation without AsyncStorage

// Business data helpers
export const saveBusinessData = async (businessId: string, businessName: string) => {
  console.log('Mock: Business data would be saved:', { businessId, businessName });
  return Promise.resolve();
};

export const getBusinessData = async () => {
  console.log('Mock: Getting business data (no actual storage)');
  return {
    businessId: null,
    businessName: null,
    hasCreatedBusiness: false
  };
};

// New function to explicitly mark that a business exists
export const markBusinessAsCreated = async () => {
  console.log('Mock: Business would be marked as created');
  return Promise.resolve(true);
};

// New function to check if business exists in storage
export const checkBusinessExistsInStorage = async (): Promise<boolean> => {
  console.log('Mock: Checking if business exists (always false)');
  return Promise.resolve(false);
};

// Clear business data (for testing or logout)
export const clearBusinessData = async () => {
  console.log('Mock: Business data would be cleared');
  return Promise.resolve();
};

// Check if a business has been created
export const hasCreatedBusiness = async () => {
  console.log('Mock: Checking if business has been created (always false)');
  return Promise.resolve(false);
};

// Declare the global type for TypeScript
declare global {
  var __hasCreatedBusiness: boolean;
}

// Synchronous version for immediate checks (returns cached value or false)
export const hasCreatedBusinessSync = () => {
  // This always returns false as we're not storing anything
  return false;
};

// Initialize the global cache - always false
global.__hasCreatedBusiness = false;
