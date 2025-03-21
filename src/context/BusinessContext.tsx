import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of our business data
interface BusinessData {
  id: string;
  name: string;
  // Add other business properties as needed
}

// Define the context shape
interface BusinessContextType {
  businessData: BusinessData | null;
  setBusinessData: (data: BusinessData | null) => void;
  hasCreatedBusiness: boolean;
  setHasCreatedBusiness: (value: boolean) => void;
}

// Create the context with default values
const BusinessContext = createContext<BusinessContextType>({
  businessData: null,
  setBusinessData: () => {},
  hasCreatedBusiness: false,
  setHasCreatedBusiness: () => {},
});

// Create a provider component
export const BusinessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [hasCreatedBusiness, setHasCreatedBusiness] = useState<boolean>(false);

  return (
    <BusinessContext.Provider
      value={{
        businessData,
        setBusinessData,
        hasCreatedBusiness,
        setHasCreatedBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

// Create a custom hook for using the business context
export const useBusinessContext = () => useContext(BusinessContext);
