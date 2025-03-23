import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({
  Business: a
  .model({
    id: a.id().required(),
    name: a.string().required(),
    phoneNumber: a.string().required(),
    location: a.string(),
    owner: a.string().required(),
    employees: a.hasMany("Employee", "businessID"),
    services: a.hasMany("Service", "businessID"),
    orders: a.hasMany("Order", "businessID"),
    appointments: a.hasMany("Appointment", "businessID"),
    customers: a.hasMany("Customer", "businessID"),
    products: a.hasMany("Product", "businessID"),
    transactions: a.hasMany("Transaction", "businessID"),
    counters: a.hasMany("Counter", "businessID"),
    employeeBusinessLinks: a.hasMany("EmployeeBusinessLink", "businessID"),
    garmentBusinessLinks: a.hasMany("GarmentBusinessLink", "businessID")
  })
  .authorization((allow) => [
    allow.owner(),
    allow.authenticated().to(['get', 'list'])
  ])
  .secondaryIndexes((index) => [
    index("name").sortKeys(["phoneNumber"])
  ]),

  Employee: a
  .model({
    id: a.id().required(),
    email: a.string().required(),
    firstName: a.string().required(),
    lastName: a.string().required(),
    role: a.string().required(), // OWNER, MANAGER, STAFF
    phoneNumber: a.phone().required(),
    city: a.string(),
    zipCode: a.string(),
    state: a.string(),
    country: a.string(),
    address: a.string(),
    businessID: a.id().required(),
    business: a.belongsTo("Business", "businessID"),
    orders: a.hasMany("Order", "employeeID"),
    appointments: a.hasMany("Appointment", "employeeID"),
    employeeBusinessLinks: a.hasMany("EmployeeBusinessLink", "employeeID")
  })
  .secondaryIndexes((index) => [
    index("phoneNumber").sortKeys(["lastName"])
  ])
  .authorization((allow) => allow.owner()),

  Service: a
    .model({
      id: a.id().required(),
      businessID: a.id().required(),
      name: a.string().required(), // e.g., "Dry Cleaning", "Tailoring", "Pressing"
      description: a.string(),
      basePrice: a.float().required(),
      estimatedDuration: a.integer().required(), // in minutes
      business: a.belongsTo("Business", "businessID"),
      orderItems: a.hasMany("OrderItem", "serviceID"),
      products: a.hasMany("Product", "serviceID")
    })
    .authorization((allow) => allow.owner()),

  Order: a
    .model({
      id: a.id().required(),
      businessID: a.id().required(),
      customerID: a.id().required(),
      employeeID: a.id().required(),
      appointmentID: a.id(), // Optional, as not all orders need appointments
      orderNumber: a.string().required(),
      dropOffDate: a.datetime().required(),
      promisedDate: a.datetime().required(),
      completedDate: a.datetime(),
      status: a.string().required(), // RECEIVED, IN_PROGRESS, READY, COMPLETED, CANCELLED
      total: a.float().required(),
      paymentStatus: a.string().required(), // PENDING, PAID, REFUNDED
      paymentMethod: a.string(), // CASH, CARD, etc.
      notes: a.string(),
      items: a.hasMany("OrderItem", "orderID"),
      business: a.belongsTo("Business", "businessID"),
      customer: a.belongsTo("Customer", "customerID"),
      employee: a.belongsTo("Employee", "employeeID"),
      appointment: a.belongsTo("Appointment", "appointmentID")
    })
    .authorization((allow) => allow.owner()),

  OrderItem: a
    .model({
      id: a.id().required(),
      orderID: a.id().required(),
      serviceID: a.id().required(),
      quantity: a.integer().required(),
      price: a.float().required(),
      notes: a.string(),
      status: a.string().required(), // PENDING, IN_PROGRESS, COMPLETED
      order: a.belongsTo("Order", "orderID"),
      service: a.belongsTo("Service", "serviceID")
    })
    .authorization((allow) => allow.owner()),

  Garment: a
    .model({
      id: a.id().required(),
      qrCode: a.string().required(),
      description: a.string().required(),
      status: a.string().required(), // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
      notes: a.string(),
      type: a.string().required(), // CLOTHING, ACCESSORY, SHOE, OTHER
      brand: a.string(),
      size: a.string(),
      color: a.string(),
      material: a.string(),
      lastScanned: a.datetime(),
      imageUrl: a.string(),
      transactionItemID: a.id().required(),
      transactionItem: a.belongsTo("TransactionItem", "transactionItemID"),
      garmentBusinessLinks: a.hasMany("GarmentBusinessLink", "garmentID")
    })
    .secondaryIndexes((index) => [
      index("qrCode")
    ])
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['list', 'get'])
    ]),

  Appointment: a
    .model({
      id: a.id().required(),
      businessID: a.id().required(),
      customerID: a.id().required(),
      employeeID: a.id(),
      date: a.datetime().required(),
      type: a.string().required(), // DROP_OFF, PICK_UP, FITTING
      status: a.string().required(), // SCHEDULED, CONFIRMED, COMPLETED, CANCELLED
      notes: a.string(),
      business: a.belongsTo("Business", "businessID"),
      customer: a.belongsTo("Customer", "customerID"),
      employee: a.belongsTo("Employee", "employeeID"),
      order: a.hasOne("Order", "appointmentID")
    })
    .authorization((allow) => allow.owner()),
    
  Customer: a
    .model({
      id: a.id().required(),
      businessID: a.id().required(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      phoneNumber: a.phone().required(),
      email: a.email(),
      address: a.string(),
      profileImageUrl: a.string(),
      qrCode: a.string().required(), // Unique QR code for customer identification
      preferredContactMethod: a.string(),
      notificationPreferences: a.boolean(),
      customerNotes: a.string(),
      customerType: a.string(),
      business: a.belongsTo("Business", "businessID"),
      orders: a.hasMany("Order", "customerID"),
      appointments: a.hasMany("Appointment", "customerID"),
      transactions: a.hasMany("Transaction", "customerID"),
      globalId: a.string(), // Used to link the same customer across different businesses
      accountVerified: a.boolean(),
      lastLogin: a.datetime(),
    })
    .secondaryIndexes((index) => [
      index("businessID").sortKeys(["lastName"]),
      index("phoneNumber"),
      index("email"),
      index("qrCode"),
      index("globalId")
    ])
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['list', 'get'])
    ]),
    
  Product: a
    .model({
      id: a.id().required(),
      serviceID: a.id().required(),
      businessID: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      price: a.float().required(),
      inventory: a.integer(),
      imageUrl: a.string(),
      isActive: a.boolean().required(),
      service: a.belongsTo("Service", "serviceID"),
      business: a.belongsTo("Business", "businessID")
    })
    .authorization((allow) => allow.owner()),
    
  Transaction: a
    .model({
      id: a.id().required(),
      businessID: a.id().required(),
      customerID: a.id().required(),
      orderNumber: a.integer(),
      status: a.string().required(),
      total: a.float().required(),
      paymentMethod: a.string().required(),
      pickupDate: a.string().required(),
      customerNotes: a.string(),
      receiptSent: a.boolean(),
      receiptEmail: a.string(),
      customerPhone: a.string(),
      business: a.belongsTo("Business", "businessID"),
      customer: a.belongsTo("Customer", "customerID"),
      items: a.hasMany("TransactionItem", "transactionID")
    })
    .authorization((allow) => allow.owner()),
    
  TransactionItem: a
    .model({
      id: a.id().required(),
      transactionID: a.id().required(),
      itemType: a.string().required(),
      name: a.string().required(),
      quantity: a.integer().required(),
      price: a.float().required(),
      serviceID: a.id(),
      productID: a.id(),
      transaction: a.belongsTo("Transaction", "transactionID"),
      garments: a.hasMany("Garment", "transactionItemID")
    })
    .authorization((allow) => allow.owner()),
    
  Counter: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      value: a.integer().required(),
      businessID: a.id().required(),
      business: a.belongsTo("Business", "businessID")
    })
    .authorization((allow) => allow.owner()),

  EmployeeBusinessLink: a
    .model({
      id: a.id().required(),
      employeeID: a.id().required(),
      businessID: a.id().required(),
      employee: a.belongsTo("Employee", "employeeID"),
      business: a.belongsTo("Business", "businessID")
    })
    .authorization((allow) => allow.owner()),

  GarmentBusinessLink: a
    .model({
      id: a.id().required(),
      garmentID: a.id().required(),
      businessID: a.id().required(),
      garment: a.belongsTo("Garment", "garmentID"),
      business: a.belongsTo("Business", "businessID")
    })
    .authorization((allow) => allow.owner()),

});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
}); 