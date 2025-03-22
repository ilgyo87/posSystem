import { Alert } from 'react-native';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';
import { isQRCodeUnique } from './validationUtils';

// Initialize Amplify client
const client = generateClient<Schema>();

/**
 * Function to update a garment's status
 */
export const updateGarmentStatus = async (
  garment: Schema['Garment']['type'],
  newStatus: string,
  onSuccess?: (updatedGarment: Schema['Garment']['type']) => void,
  onError?: (error: Error) => void
) => {
  try {
    const updateResult = await client.models.Garment.update({
      id: garment.id,
      status: newStatus,
      lastScanned: new Date().toISOString()
    });
    
    if (updateResult.errors || !updateResult.data) {
      throw new Error('Failed to update garment status');
    }
    
    if (onSuccess) {
      onSuccess(updateResult.data);
    }
    
    return updateResult.data;
  } catch (error) {
    console.error('Error updating garment status:', error);
    if (onError) {
      onError(error as Error);
    } else {
      Alert.alert('Error', 'Failed to update garment status');
    }
    return null;
  }
};

/**
 * Function to add a new garment to an order
 */
export const createGarment = async (
  transactionItemID: string,
  qrCode: string,
  description: string,
  status: string = 'IN_PROGRESS',
  onSuccess?: (newGarment: Schema['Garment']['type']) => void,
  onError?: (error: Error) => void
) => {
  try {
    const garmentResult = await client.models.Garment.create({
      transactionItemID,
      qrCode,
      description,
      status,
      type: 'CLOTHING',
      lastScanned: new Date().toISOString()
    });

    if (garmentResult.errors || !garmentResult.data) {
      throw new Error('Failed to create garment');
    }

    if (onSuccess) {
      onSuccess(garmentResult.data);
    }
    
    return garmentResult.data;
  } catch (error) {
    console.error('Error creating garment:', error);
    if (onError) {
      onError(error as Error);
    } else {
      Alert.alert('Error', 'Failed to create garment');
    }
    return null;
  }
};

/**
 * Function to check if a barcode exists in any garment
 */
export const checkBarcodeExists = async (
  barcode: string
): Promise<Schema['Garment']['type'] | null> => {
  try {
    const existingGarmentsResult = await client.models.Garment.list({
      filter: { qrCode: { eq: barcode.trim() } }
    });
    
    if (existingGarmentsResult.data && existingGarmentsResult.data.length > 0) {
      return existingGarmentsResult.data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error checking barcode uniqueness:', error);
    return null;
  }
};

/**
 * Function to update an order's status
 */
export const updateOrderStatus = async (
  orderId: string,
  newStatus: string,
  customerNotes?: string,
  onSuccess?: (updatedOrder: Schema['Transaction']['type']) => void,
  onError?: (error: Error) => void
) => {
  try {
    // Get current order to append notes
    const currentOrderResult = await client.models.Transaction.get({ id: orderId });
    
    if (currentOrderResult.errors || !currentOrderResult.data) {
      throw new Error('Failed to fetch current order');
    }
    
    const currentOrder = currentOrderResult.data;
    const currentNotes = currentOrder.customerNotes || '';
    const statusNote = `\n[${new Date().toLocaleString()}] Status changed: ${currentOrder.status} → ${newStatus}`;
    const updatedNotes = customerNotes || (currentNotes + statusNote);
    
    const updateResult = await client.models.Transaction.update({
      id: orderId,
      status: newStatus,
      customerNotes: updatedNotes
    });

    if (updateResult.errors || !updateResult.data) {
      throw new Error('Failed to update order status');
    }

    if (onSuccess) {
      onSuccess(updateResult.data);
    }
    
    return updateResult.data;
  } catch (error) {
    console.error('Error updating order status:', error);
    if (onError) {
      onError(error as Error);
    } else {
      Alert.alert('Error', `Failed to update order status to ${newStatus}`);
    }
    return null;
  }
};

/**
 * Function to adjust the quantity of an order item
 */
export const adjustItemQuantity = async (
  item: Schema['TransactionItem']['type'],
  newQuantity: number,
  adjustmentNote?: string,
  onSuccess?: (updatedItem: Schema['TransactionItem']['type']) => void,
  onError?: (error: Error) => void
) => {
  try {
    const updateResult = await client.models.TransactionItem.update({
      id: item.id,
      quantity: newQuantity
    });

    if (updateResult.errors || !updateResult.data) {
      throw new Error('Failed to update quantity');
    }

    // If adjustment note is provided, update order notes
    if (adjustmentNote && item.transactionID) {
      const currentOrderResult = await client.models.Transaction.get({ id: item.transactionID });
      
      if (currentOrderResult.data) {
        const currentOrder = currentOrderResult.data;
        const currentNotes = currentOrder.customerNotes || '';
        const updatedNotes = currentNotes + '\n' + adjustmentNote;
        
        await client.models.Transaction.update({
          id: item.transactionID,
          customerNotes: updatedNotes
        });
      }
    }

    if (onSuccess) {
      onSuccess(updateResult.data);
    }
    
    return updateResult.data;
  } catch (error) {
    console.error('Error adjusting quantity:', error);
    if (onError) {
      onError(error as Error);
    } else {
      Alert.alert('Error', 'Failed to adjust quantity');
    }
    return null;
  }
};

/**
 * Function to generate unique QR codes for a service transaction item
 */
export const generateQRCodes = async (
  item: Schema['TransactionItem']['type'],
  serviceName: string,
  quantity: number,
  businessID?: string,
  onSuccess?: (qrCodes: {qrCode: string, description: string}[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    if (!item || !serviceName || isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid parameters for QR code generation`);
    }

    const newGarments: Schema['Garment']['type'][] = [];
    const qrCodes: {qrCode: string, description: string}[] = [];
    
    for (let i = 0; i < quantity; i++) {
      // Generate a unique QR code with multiple attempts if needed
      let qrCode = '';
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!isUnique && attempts < maxAttempts) {
        // Generate a random component using timestamp, random number, and base36 encoding
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        
        // Add business context to increase uniqueness across users
        const businessPrefix = businessID ? businessID.substring(0, 8) : 'business';
        qrCode = `${businessPrefix}-${serviceName}-${timestamp}-${random}-${i}`;
        
        // Check if this code exists in ANY user's data using our validation function
        isUnique = await isQRCodeUnique(qrCode);
        attempts++;
      }
      
      if (!isUnique) {
        throw new Error(`Could not generate a unique QR code after ${maxAttempts} attempts`);
      }
      
      // Create a description for this garment
      const itemName = item.name || 'Item';
      const description = `${itemName} #${i + 1}`;
      
      // Create a new garment with the schema fields
      const garmentResult = await client.models.Garment.create({
        transactionItemID: item.id,
        qrCode: qrCode,
        description: description,
        status: 'PENDING',
        type: 'CLOTHING',
        lastScanned: new Date().toISOString()
      });

      if (garmentResult.errors || !garmentResult.data) {
        throw new Error('Failed to create garment');
      }
      
      newGarments.push(garmentResult.data);
      qrCodes.push({
        qrCode: qrCode,
        description: description
      });
    }
    
    if (onSuccess) {
      onSuccess(qrCodes);
    }
    
    return qrCodes;
  } catch (error) {
    console.error('Error generating QR codes:', error);
    if (onError) {
      onError(error as Error);
    } else {
      Alert.alert('Error', 'Failed to generate QR codes');
    }
    return [];
  }
};

/**
 * Function to handle image uploads for garments
 */
export const uploadGarmentImage = async (
  garment: Schema['Garment']['type'],
  imageUri: string,
  uploadData: any,
  getUrl: any,
  onSuccess?: (imageUrl: string) => void,
  onError?: (error: Error) => void
) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to S3
    const key = `garments/${garment.id}/${Date.now()}.jpg`;
    await uploadData({
      key,
      data: blob,
      options: {
        contentType: 'image/jpeg',
      }
    });

    // Get the URL of the uploaded file
    const { url } = await getUrl({ key });

    // Update the garment with the image URL
    const updateResult = await client.models.Garment.update({
      id: garment.id,
      imageUrl: url.toString()
    });

    if (updateResult.errors) {
      throw new Error('Failed to update garment with image URL');
    }

    if (onSuccess) {
      onSuccess(url.toString());
    }
    
    return url.toString();
  } catch (error) {
    console.error('Error uploading image:', error);
    if (onError) {
      onError(error as Error);
    } else {
      Alert.alert('Error', 'Failed to upload image');
    }
    return null;
  }
};

/**
 * Function to delete a garment image
 */
export const deleteGarmentImage = async (
  garment: Schema['Garment']['type'],
  remove: any,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) => {
  try {
    if (!garment.imageUrl) {
      throw new Error('No image URL found');
    }
    
    // Extract the key from the URL
    const url = new URL(garment.imageUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    // Delete from S3
    await remove({ key });

    // Update the garment to remove the image URL
    const updateResult = await client.models.Garment.update({
      id: garment.id,
      imageUrl: null
    });

    if (updateResult.errors) {
      throw new Error('Failed to update garment');
    }

    if (onSuccess) {
      onSuccess();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    if (onError) {
      onError(error as Error);
    } else {
      Alert.alert('Error', 'Failed to delete image');
    }
    return false;
  }
}; 