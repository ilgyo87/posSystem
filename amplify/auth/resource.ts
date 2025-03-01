import { defineAuth } from "@aws-amplify/backend"

import { type ClientSchema, a, defineData } from "@aws-amplify/backend"

const schema = a.schema({
  Business: a
    .model({
      businessName: a.string(),
      ownerEmail: a.string()
    })
    .authorization(allow => [allow.owner()]),

  User: a
    .model({
      email: a.string(),
      role: a.string()
    })
    .authorization(allow => [allow.owner()]),

  Customer: a
    .model({
      name: a.string(),
      phoneNumber: a.string()
    })
    .authorization(allow => [allow.owner()]),

  Inventory: a
    .model({
      itemName: a.string(),
      quantity: a.string(),
      price: a.string()
    })
    .authorization(allow => [allow.owner()])
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool"
  }
})
