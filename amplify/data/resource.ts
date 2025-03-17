import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({
  Business: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      phoneNumber: a.phone().required(),
      location: a.string(),
      employees: a.hasMany("Employee", "businessID"),
      services: a.hasMany("Service", "businessID"),
      orders: a.hasMany("Order", "businessID"),
      appointments: a.hasMany("Appointment", "businessID"),
      customers: a.hasMany("Customer", "businessID"),
      products: a.hasMany("Product", "businessID")
    })
    .authorization((allow) => allow.owner()),

  Employee: a
    .model({
      id: a.id().required(),
      businessID: a.id().required(),
      email: a.string().required(),
      name: a.string().required(),
      role: a.string().required(), // OWNER, MANAGER, STAFF
      business: a.belongsTo("Business", "businessID"),
      orders: a.hasMany("Order", "employeeID"),
      appointments: a.hasMany("Appointment", "employeeID")
    })
    .authorization((allow) => allow.owner()),

  Service: a
    .model({
      id: a.id().required(),
      businessID: a.id().required(),
      name: a.string().required(), // e.g., "Dry Cleaning", "Tailoring", "Pressing"
      description: a.string(),
      basePrice: a.float().required(),
      estimatedDuration: a.integer().required(), // in minutes
      category: a.string().required(), // e.g., "DRY_CLEANING", "LAUNDRY", "ALTERATIONS"
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
      preferredContactMethod: a.string().required(), // EMAIL, SMS, BOTH
      notificationPreferences: a.boolean().required(), // true if they want notifications
      business: a.belongsTo("Business", "businessID"),
      orders: a.hasMany("Order", "customerID"),
      appointments: a.hasMany("Appointment", "customerID")
    })
    .authorization((allow) => allow.owner()),
    
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
    .authorization((allow) => allow.owner())
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
});