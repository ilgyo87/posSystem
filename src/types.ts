export type ServiceCategory = 'DRY_CLEANING' | 'LAUNDRY' | 'ALTERATIONS';

// Type definitions for data models used in the application
export type OrderData = {
  id: string;
  businessID: string;
  customerID: string;
  orderNumber?: number;
  status: string;
  total: number;
  paymentMethod: string;
  pickupDate: string;
  customerNotes?: string;
  receiptSent?: boolean;
  receiptEmail?: string;
  customerPhone?: string;
  firstName?: string;
  lastName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  createdAt: string;
  updatedAt?: string;
};

export type TransactionItemData = {
  id: string;
  transactionID: string;
  itemType: string;
  name: string;
  quantity: number;
  price: number;
  serviceID?: string;
  productID?: string;
};

export type GarmentData = {
  id: string;
  qrCode: string;
  description: string;
  status: string;
  notes?: string;
  type: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  lastScanned?: Date;
  imageUrl?: string;
  transactionItemID: string;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Dashboard: { businessId: string; businessName?: string };
  OrderManagement: { businessId: string };
  OrderDetails: { orderId: string; businessId: string };
  EditOrder: { orderId: string; businessId: string };
  BusinessManagement: { businessId: string };
  BusinessSetup: undefined;
  GarmentTypes: { businessId: string };
  RackAssignment: { orderId: string; businessId: string };
  CompletedOrderDetails: { orderId: string; businessId: string };
  Checkout: { 
    businessId: string; 
    customerId: string; 
    customerName: string; 
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
  // ServiceManagement removed - functionality now in ProductManagement
  ProductManagement: { businessId: string };
  EmployeeManagement: { businessId: string };
  Appointments: { businessId: string };
  Customers: { businessId: string };
  CustomerSelection: { businessId: string; businessName?: string };
  Reports: { businessId: string };
  DataExport: { businessId: string };
  Settings: { businessId: string };
  BusinessCreate: undefined;
  BarcodeScanner: { onScan: (code: string) => void; scanType?: 'customer' | 'garment' | 'order' };
  ProductSelection: { businessId: string; customerId: string; customerName: string };
};
