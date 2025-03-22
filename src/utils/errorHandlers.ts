import { Alert } from 'react-native';

/**
 * Types of error codes that can be returned from Amplify Data API
 */
export enum ErrorCodes {
  DUPLICATE_ENTRY = 'UNIQUE_CONSTRAINT_VIOLATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Extract the error code from an Amplify Data API error
 */
export const getErrorCode = (error: any): ErrorCodes => {
  // Check for constraint errors
  if (error?.message?.includes('unique constraint')) {
    return ErrorCodes.DUPLICATE_ENTRY;
  }
  
  // Handle other error types
  if (error?.message?.includes('not found')) {
    return ErrorCodes.NOT_FOUND;
  }
  
  if (error?.message?.includes('not authorized')) {
    return ErrorCodes.UNAUTHORIZED;
  }
  
  if (error?.message?.includes('validation failed')) {
    return ErrorCodes.INVALID_INPUT;
  }
  
  return ErrorCodes.UNKNOWN;
};

/**
 * Get a user-friendly error message based on the error code
 */
export const getErrorMessage = (
  error: any, 
  entityType: string = 'record'
): string => {
  const errorCode = getErrorCode(error);
  
  switch (errorCode) {
    case ErrorCodes.DUPLICATE_ENTRY:
      return `A ${entityType} with these details already exists. Please modify and try again.`;
    
    case ErrorCodes.NOT_FOUND:
      return `The ${entityType} could not be found.`;
    
    case ErrorCodes.UNAUTHORIZED:
      return `You don't have permission to perform this action.`;
    
    case ErrorCodes.INVALID_INPUT:
      return `Invalid input provided. Please check the form and try again.`;
    
    case ErrorCodes.UNKNOWN:
    default:
      return `An error occurred while processing your request. Please try again later.`;
  }
};

/**
 * Extract fields from unique constraint violation errors
 */
export const getViolatedFields = (error: any): string[] => {
  try {
    // Try to extract field names from the error message
    const message = error?.message || '';
    const matches = message.match(/unique constraint on \[(.*?)\]/i);
    
    if (matches && matches[1]) {
      return matches[1].split(',').map((field: string) => field.trim());
    }
    
    return [];
  } catch (e) {
    console.error('Error extracting violated fields:', e);
    return [];
  }
};

/**
 * Handle Amplify Data API errors with appropriate UI feedback
 */
export const handleDataError = (
  error: any,
  entityType: string = 'record',
  customHandlers?: {
    [ErrorCodes.DUPLICATE_ENTRY]?: (fields: string[]) => void;
    [ErrorCodes.NOT_FOUND]?: () => void;
    [ErrorCodes.UNAUTHORIZED]?: () => void;
    [ErrorCodes.INVALID_INPUT]?: () => void;
    [ErrorCodes.UNKNOWN]?: () => void;
  }
): void => {
  console.error(`Error handling ${entityType}:`, error);
  
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error, entityType);
  
  // Check if there's a custom handler for this error type
  if (customHandlers && customHandlers[errorCode]) {
    const fields = errorCode === ErrorCodes.DUPLICATE_ENTRY ? getViolatedFields(error) : [];
    if (errorCode === ErrorCodes.DUPLICATE_ENTRY && customHandlers[ErrorCodes.DUPLICATE_ENTRY]) {
      customHandlers[ErrorCodes.DUPLICATE_ENTRY](fields);
      return;
    } else if (customHandlers[errorCode]) {
      (customHandlers[errorCode] as () => void)();
      return;
    }
  }
  
  // Default error handling - show an alert
  Alert.alert(
    'Error',
    errorMessage,
    [{ text: 'OK', style: 'default' }]
  );
}; 