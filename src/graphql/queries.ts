/* eslint-disable */
// This file is auto-generated and will be overwritten once Amplify is configured and deployed

export const getBusiness = /* GraphQL */ `
  query GetBusiness($id: ID!) {
    getBusiness(id: $id) {
      id
      name
      phoneNumber
      location
      createdAt
      updatedAt
      owner
    }
  }
`;

export const listBusinesses = /* GraphQL */ `
  query ListBusinesses(
    $filter: ModelBusinessFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listBusinesses(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        phoneNumber
        location
        createdAt
        updatedAt
        owner
      }
      nextToken
    }
  }
`;

export const getEmployee = /* GraphQL */ `
  query GetEmployee($id: ID!) {
    getEmployee(id: $id) {
      id
      firstName
      lastName
      email
      phoneNumber
      role
      createdAt
      updatedAt
      businessEmployeesId
      owner
    }
  }
`;

export const listEmployees = /* GraphQL */ `
  query ListEmployees(
    $filter: ModelEmployeeFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEmployees(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        firstName
        lastName
        email
        phoneNumber
        role
        createdAt
        updatedAt
        businessEmployeesId
        owner
      }
      nextToken
    }
  }
`;

export const getProduct = /* GraphQL */ `
  query GetProduct($id: ID!) {
    getProduct(id: $id) {
      id
      name
      description
      price
      category
      sku
      inventory
      createdAt
      updatedAt
      businessProductsId
      owner
    }
  }
`;

export const listProducts = /* GraphQL */ `
  query ListProducts(
    $filter: ModelProductFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listProducts(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        description
        price
        category
        sku
        inventory
        createdAt
        updatedAt
        businessProductsId
        owner
      }
      nextToken
    }
  }
`;

export const getService = /* GraphQL */ `
  query GetService($id: ID!) {
    getService(id: $id) {
      id
      name
      description
      price
      category
      createdAt
      updatedAt
      businessServicesId
      owner
    }
  }
`;

export const listServices = /* GraphQL */ `
  query ListServices(
    $filter: ModelServiceFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listServices(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        description
        price
        category
        createdAt
        updatedAt
        businessServicesId
        owner
      }
      nextToken
    }
  }
`;

export const getTransaction = /* GraphQL */ `
  query GetTransaction($id: ID!) {
    getTransaction(id: $id) {
      id
      date
      total
      status
      paymentMethod
      createdAt
      updatedAt
      businessTransactionsId
      owner
    }
  }
`;

export const listTransactions = /* GraphQL */ `
  query ListTransactions(
    $filter: ModelTransactionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTransactions(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        date
        total
        status
        paymentMethod
        createdAt
        updatedAt
        businessTransactionsId
        owner
      }
      nextToken
    }
  }
`;

export const getTransactionItem = /* GraphQL */ `
  query GetTransactionItem($id: ID!) {
    getTransactionItem(id: $id) {
      id
      quantity
      price
      createdAt
      updatedAt
      transactionItemsId
      transactionItemProductId
      owner
    }
  }
`;

export const listTransactionItems = /* GraphQL */ `
  query ListTransactionItems(
    $filter: ModelTransactionItemFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTransactionItems(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        quantity
        price
        createdAt
        updatedAt
        transactionItemsId
        transactionItemProductId
        owner
      }
      nextToken
    }
  }
`;
