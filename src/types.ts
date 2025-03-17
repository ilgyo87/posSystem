export type ServiceCategory = 'DRY_CLEANING' | 'LAUNDRY' | 'ALTERATIONS';

export type RootStackParamList = {
  BusinessCreate: undefined;
  Dashboard: { businessId?: string; businessName?: string };
  CustomerSelection: { businessId?: string; businessName?: string };
  ProductSelection: { businessId?: string; customerId?: string; customerName?: string };
  ServiceManagement: { businessId?: string };
  ProductManagement: { businessId?: string };
  EmployeeManagement: { businessId?: string };
  Appointments: { businessId?: string };
  Orders: { businessId?: string };
  Customers: { businessId?: string };
  Reports: { businessId?: string };
  Settings: { businessId?: string };
};
