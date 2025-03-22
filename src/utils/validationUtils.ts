import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Alert } from 'react-native';

const client = generateClient<Schema>();

/**
 * Check if a business with the same name and phone number exists
 * This function uses the secondary index defined in the schema for efficient lookups
 */
export const isBusinessUnique = async (name: string, phoneNumber: string): Promise<boolean> => {
  try {
    // Order matters for secondary index - phoneNumber first, then name
    const existingBusinesses = await client.models.Business.list({
      filter: {
        phoneNumber: { eq: phoneNumber.trim() },
        name: { eq: name.trim() }
      },
      limit: 1
    });
    
    return !existingBusinesses.data || existingBusinesses.data.length === 0;
  } catch (error) {
    console.error('Error checking business uniqueness:', error);
    return false; // Assume it's not unique on error, to be safe
  }
};

/**
 * Check if an employee with the same first name, last name, phone number exists within a specific business
 * Uses the secondary index defined in the schema for efficient lookups
 */
export const isEmployeeUnique = async (
  firstName: string, 
  lastName: string, 
  phoneNumber: string,
  businessID: string
): Promise<boolean> => {
  try {
    // Order matches the secondary index (phoneNumber, lastName)
    const existingEmployees = await client.models.Employee.list({
      filter: {
        phoneNumber: { eq: phoneNumber.trim() },
        lastName: { eq: lastName.trim() },
        firstName: { eq: firstName.trim() },
        businessID: { eq: businessID }
      },
      limit: 1
    });
    
    return !existingEmployees.data || existingEmployees.data.length === 0;
  } catch (error) {
    console.error('Error checking employee uniqueness:', error);
    return false; // Assume it's not unique on error, to be safe
  }
};

/**
 * Check if a customer profile with the same phone number already exists globally
 * This function returns the existing profile if found
 */
export const findExistingCustomerProfile = async (
  phoneNumber: string
): Promise<{ exists: boolean; profile?: Schema['CustomerProfile']['type'] }> => {
  try {
    // Use secondary index on phoneNumber for efficient lookup
    const existingProfiles = await client.models.CustomerProfile.list({
      filter: {
        phoneNumber: { eq: phoneNumber.trim() }
      },
      limit: 1
    });
    
    if (existingProfiles.data && existingProfiles.data.length > 0) {
      return { exists: true, profile: existingProfiles.data[0] };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking customer profile existence:', error);
    return { exists: false }; // Assume it doesn't exist on error
  }
};

/**
 * Check if a customer link already exists between a business and a customer profile
 */
export const isCustomerLinkUnique = async (
  businessID: string,
  customerProfileID: string
): Promise<boolean> => {
  try {
    // Use the compound index on businessID and customerProfileID
    const existingLinks = await client.models.CustomerLink.list({
      filter: {
        businessID: { eq: businessID },
        customerProfileID: { eq: customerProfileID }
      },
      limit: 1
    });
    
    return !existingLinks.data || existingLinks.data.length === 0;
  } catch (error) {
    console.error('Error checking customer link uniqueness:', error);
    return false; // Assume it's not unique on error, to be safe
  }
};

/**
 * Check if a QR code is unique across all garments
 * Uses the secondary index defined in the schema for efficient lookups
 */
export const isQRCodeUnique = async (qrCode: string): Promise<boolean> => {
  try {
    // Use the qrCode secondary index for efficient lookup
    const existingGarments = await client.models.Garment.list({
      filter: {
        qrCode: { eq: qrCode.trim() }
      },
      limit: 1
    });
    
    return !existingGarments.data || existingGarments.data.length === 0;
  } catch (error) {
    console.error('Error checking QR code uniqueness:', error);
    return false; // Assume it's not unique on error, to be safe
  }
};

/**
 * Check if a barcode exists in any order, regardless of owner
 * Uses the Garment table's secondary index for efficient lookups
 */
export const checkBarcodeStatusAcrossUsers = async (
  qrCode: string
): Promise<{ exists: boolean; garment?: any; order?: any; status?: string }> => {
  try {
    // Use the qrCode secondary index for efficient lookup
    const garmentResult = await client.models.Garment.list({
      filter: {
        qrCode: { eq: qrCode.trim() }
      },
      limit: 1
    });
    
    if (!garmentResult.data || garmentResult.data.length === 0) {
      return { exists: false };
    }
    
    const garment = garmentResult.data[0];
    
    // Get the transaction item
    const transactionItemResult = await client.models.TransactionItem.get({
      id: garment.transactionItemID
    });
    
    if (!transactionItemResult.data) {
      return { exists: true, garment, status: garment.status };
    }
    
    // Get the order
    const orderResult = await client.models.Transaction.get({
      id: transactionItemResult.data.transactionID
    });
    
    return {
      exists: true,
      garment,
      order: orderResult.data || undefined,
      status: garment.status
    };
  } catch (error) {
    console.error('Error checking barcode status:', error);
    return { exists: false }; // Assume it doesn't exist on error
  }
};

/**
 * Generates a unique QR code for a garment with improved uniqueness guarantees
 * Uses the qrCode secondary index to verify uniqueness across all users
 */
export const generateUniqueQRCode = async (
  businessID: string,
  serviceName: string, 
  index: number
): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    // Generate a potential QR code with business context, timestamp, and randomness
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    // Use first 8 chars of business ID to add context without making code too long
    const businessPrefix = businessID ? businessID.substring(0, 8) : 'business';
    const qrCode = `${businessPrefix}-${serviceName}-${timestamp}-${random}-${index}`;
    
    // Check if it's unique across all users using the secondary index
    const isUnique = await isQRCodeUnique(qrCode);
    if (isUnique) {
      return qrCode;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate a unique QR code after multiple attempts');
}; 