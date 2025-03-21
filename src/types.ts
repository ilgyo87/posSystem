export type ServiceCategory = 'DRY_CLEANING' | 'LAUNDRY' | 'ALTERATIONS';

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
  ServiceManagement: { businessId: string };
  ProductManagement: { businessId: string };
  EmployeeManagement: { businessId: string };
  Appointments: { businessId: string };
  Customers: { businessId: string };
  CustomerSelection: { businessId: string; businessName?: string };
  Reports: { businessId: string };
  DataExport: { businessId: string };
  Settings: { businessId: string };
  BusinessCreate: undefined;
  BarcodeScanner: { onScan: (code: string) => void };
  ProductSelection: { businessId: string; customerId: string; customerName: string };
};
