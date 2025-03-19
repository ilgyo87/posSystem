export type ServiceCategory = 'DRY_CLEANING' | 'LAUNDRY' | 'ALTERATIONS';

export type RootStackParamList = {
  BusinessCreate: undefined;
  Dashboard: { businessId?: string; businessName?: string };
  CustomerSelection: { businessId?: string; businessName?: string };
  ProductSelection: { businessId?: string; customerId?: string; customerName?: string };
  Checkout: { 
    businessId?: string; 
    customerId?: string; 
    customerName?: string; 
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      type: 'service' | 'product';
      serviceId?: string;
      imageUrl?: string | null;
    }>;
    total: number;
    pickupDate: string;
    customerPreferences?: string;
  };
  ServiceManagement: { businessId?: string };
  ProductManagement: { businessId?: string };
  EmployeeManagement: { businessId?: string };
  Appointments: { businessId?: string };
  Orders: { businessId?: string };
  Customers: { businessId?: string };
  Reports: { businessId?: string };
  Settings: { businessId?: string };
  DataExport: { businessId?: string };
  // Order Management Screens
  OrderManagement: { businessId: string };
  OrderDetails: { orderId: string; businessId: string };
  BarcodeScanner: { 
    businessId: string; 
    onScan: (barcodeData: string) => void 
  };
  EditOrder: { orderId: string; businessId: string };
};
