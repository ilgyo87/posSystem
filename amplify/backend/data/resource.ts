import { defineData, defineAuth, a } from '@aws-amplify/backend';

// Creating a super simple schema example based on Amplify documentation
const schema = a.schema({
  Business: a.model({
    id: a.id(),
    name: a.string().required(),
    phoneNumber: a.string(),
    location: a.string(),
    owner: a.string().required()
  }).authorization((allow) => [allow.owner()]),
  
  Customer: a.model({
    id: a.id(),
    name: a.string().required(),
    email: a.string(),
    phone: a.string(),
    businessID: a.string().required(),
    address: a.string()
  }).authorization((allow) => [allow.owner()]),
  
  Employee: a.model({
    id: a.id(),
    name: a.string().required(),
    email: a.string().required(),
    role: a.string().required(),  // OWNER, MANAGER, STAFF
    businessID: a.string().required(),
    phone: a.string()
  }).authorization((allow) => [allow.owner()]),
  
  Service: a.model({
    id: a.id(),
    name: a.string().required(),  // e.g., "Dry Cleaning", "Washing", "Ironing"
    description: a.string(),
    businessID: a.string().required(),
    basePrice: a.float(),
    estimatedDuration: a.integer(),
    category: a.string(),  // DRY_CLEANING, LAUNDRY, ALTERATIONS, etc.
    isActive: a.boolean().default(true)
  }).authorization((allow) => [allow.owner()]),
  
  Product: a.model({
    id: a.id(),
    name: a.string().required(),
    description: a.string(),
    price: a.float().required(),
    businessID: a.string().required(),
    serviceID: a.string(),  // Reference to the Service this product belongs to
    inventory: a.integer().default(0),
    imageUrl: a.string(),
    isActive: a.boolean().default(true)
  }).authorization((allow) => [allow.owner()]),
  
  Order: a.model({
    id: a.id(),
    orderNumber: a.string().required(),
    customerID: a.string().required(),
    businessID: a.string().required(),
    employeeID: a.string(),
    status: a.string().required(),  // PENDING, PROCESSING, COMPLETED, CANCELLED
    total: a.float().required(),
    dropOffDate: a.datetime().required(),
    pickupDate: a.datetime(),
    notes: a.string()
  }).authorization((allow) => [allow.owner()]),
  
  OrderItem: a.model({
    id: a.id(),
    orderID: a.string().required(),
    productID: a.string().required(),
    serviceID: a.string().required(),
    quantity: a.integer().required(),
    price: a.float().required(),
    status: a.string().required()  // PENDING, PROCESSING, COMPLETED
  }).authorization((allow) => [allow.owner()]),
  
  Transaction: a.model({
    id: a.id(),
    date: a.datetime().required(),
    total: a.float().required(),
    status: a.string().required(),  // PENDING, PROCESSING, COMPLETED, CANCELLED
    businessID: a.string().required(),
    customerID: a.string().required(),
    paymentMethod: a.string(),
    pickupDate: a.string(),
    customerNotes: a.string(),
    receiptSent: a.boolean(),
    receiptEmail: a.string(),
    customerPhone: a.string()
  }).authorization((allow) => [allow.owner()]),
  
  TransactionItem: a.model({
    id: a.id(),
    quantity: a.integer().required(),
    price: a.float().required(),
    transactionID: a.string().required(),
    productID: a.string().required(),
    serviceID: a.string(),  // Reference to the Service this item belongs to
    name: a.string(),
    serviceType: a.string(),  // Store the service type directly for easier grouping
    itemType: a.string()  // SERVICE, PRODUCT
  }).authorization((allow) => [allow.owner()]),
  
  Garment: a.model({
    id: a.id(),
    qrCode: a.string().required(),
    description: a.string().required(),
    status: a.string().required(),  // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    transactionItemID: a.string().required(),
    lastScanned: a.datetime(),
    imageUrl: a.string(),
    notes: a.string()
  }).authorization((allow) => [allow.owner()])
});

// Export the data resource
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

