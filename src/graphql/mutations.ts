/* eslint-disable */
// This file is auto-generated and will be overwritten once Amplify is configured and deployed

export const createBusiness = /* GraphQL */ `
  mutation CreateBusiness(
    $input: CreateBusinessInput!
    $condition: ModelBusinessConditionInput
  ) {
    createBusiness(input: $input, condition: $condition) {
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

export const updateBusiness = /* GraphQL */ `
  mutation UpdateBusiness(
    $input: UpdateBusinessInput!
    $condition: ModelBusinessConditionInput
  ) {
    updateBusiness(input: $input, condition: $condition) {
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

export const deleteBusiness = /* GraphQL */ `
  mutation DeleteBusiness(
    $input: DeleteBusinessInput!
    $condition: ModelBusinessConditionInput
  ) {
    deleteBusiness(input: $input, condition: $condition) {
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

export const createEmployee = /* GraphQL */ `
  mutation CreateEmployee(
    $input: CreateEmployeeInput!
    $condition: ModelEmployeeConditionInput
  ) {
    createEmployee(input: $input, condition: $condition) {
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

export const updateEmployee = /* GraphQL */ `
  mutation UpdateEmployee(
    $input: UpdateEmployeeInput!
    $condition: ModelEmployeeConditionInput
  ) {
    updateEmployee(input: $input, condition: $condition) {
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

export const deleteEmployee = /* GraphQL */ `
  mutation DeleteEmployee(
    $input: DeleteEmployeeInput!
    $condition: ModelEmployeeConditionInput
  ) {
    deleteEmployee(input: $input, condition: $condition) {
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

export const createProduct = /* GraphQL */ `
  mutation CreateProduct(
    $input: CreateProductInput!
    $condition: ModelProductConditionInput
  ) {
    createProduct(input: $input, condition: $condition) {
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

export const updateProduct = /* GraphQL */ `
  mutation UpdateProduct(
    $input: UpdateProductInput!
    $condition: ModelProductConditionInput
  ) {
    updateProduct(input: $input, condition: $condition) {
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

export const deleteProduct = /* GraphQL */ `
  mutation DeleteProduct(
    $input: DeleteProductInput!
    $condition: ModelProductConditionInput
  ) {
    deleteProduct(input: $input, condition: $condition) {
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

export const createService = /* GraphQL */ `
  mutation CreateService(
    $input: CreateServiceInput!
    $condition: ModelServiceConditionInput
  ) {
    createService(input: $input, condition: $condition) {
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

export const updateService = /* GraphQL */ `
  mutation UpdateService(
    $input: UpdateServiceInput!
    $condition: ModelServiceConditionInput
  ) {
    updateService(input: $input, condition: $condition) {
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

export const deleteService = /* GraphQL */ `
  mutation DeleteService(
    $input: DeleteServiceInput!
    $condition: ModelServiceConditionInput
  ) {
    deleteService(input: $input, condition: $condition) {
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

export const createTransaction = /* GraphQL */ `
  mutation CreateTransaction(
    $input: CreateTransactionInput!
    $condition: ModelTransactionConditionInput
  ) {
    createTransaction(input: $input, condition: $condition) {
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

export const updateTransaction = /* GraphQL */ `
  mutation UpdateTransaction(
    $input: UpdateTransactionInput!
    $condition: ModelTransactionConditionInput
  ) {
    updateTransaction(input: $input, condition: $condition) {
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

export const deleteTransaction = /* GraphQL */ `
  mutation DeleteTransaction(
    $input: DeleteTransactionInput!
    $condition: ModelTransactionConditionInput
  ) {
    deleteTransaction(input: $input, condition: $condition) {
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

export const createTransactionItem = /* GraphQL */ `
  mutation CreateTransactionItem(
    $input: CreateTransactionItemInput!
    $condition: ModelTransactionItemConditionInput
  ) {
    createTransactionItem(input: $input, condition: $condition) {
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

export const updateTransactionItem = /* GraphQL */ `
  mutation UpdateTransactionItem(
    $input: UpdateTransactionItemInput!
    $condition: ModelTransactionItemConditionInput
  ) {
    updateTransactionItem(input: $input, condition: $condition) {
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

export const deleteTransactionItem = /* GraphQL */ `
  mutation DeleteTransactionItem(
    $input: DeleteTransactionItemInput!
    $condition: ModelTransactionItemConditionInput
  ) {
    deleteTransactionItem(input: $input, condition: $condition) {
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
