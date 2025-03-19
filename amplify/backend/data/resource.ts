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
  
  Product: a.model({
    id: a.id(),
    name: a.string().required(),
    description: a.string(),
    price: a.float().required(),
    businessID: a.string().required(),
    inventory: a.integer().default(0)
  }).authorization((allow) => [allow.owner()]),
  
  Transaction: a.model({
    id: a.id(),
    date: a.datetime().required(),
    total: a.float().required(),
    status: a.string().required(),
    businessID: a.string().required(),
    paymentMethod: a.string()
  }).authorization((allow) => [allow.owner()]),
  
  TransactionItem: a.model({
    id: a.id(),
    quantity: a.integer().required(),
    price: a.float().required(),
    transactionID: a.string().required(),
    productID: a.string().required()
  }).authorization((allow) => [allow.owner()])
});

// Export the data resource
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

