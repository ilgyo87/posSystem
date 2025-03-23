import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  useWindowDimensions
} from 'react-native';
import { productManagementStyles as styles } from './styles/productManagement.styles';
import { commonStyles } from './styles/common.styles';
// No longer using predefined data
import { generateClient } from 'aws-amplify/data';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList, ServiceCategory } from './types';

const client = generateClient<Schema>();

type ProductManagementProps = NativeStackScreenProps<RootStackParamList, 'ProductManagement'>;

// Define service with products
type ServiceWithProducts = {
  service: Schema['Service']['type'];
  products: Schema['Product']['type'][];
};

// Function to extract category from description
const getCategoryFromDescription = (description: string | null | undefined): ServiceCategory => {
  if (!description) return 'DRY_CLEANING';
  
  // Look for category in format [CATEGORY:XXX]
  const match = description.match(/\[CATEGORY:(.*?)\]/);
  if (match && match[1] && ['DRY_CLEANING', 'LAUNDRY', 'ALTERATIONS'].includes(match[1] as ServiceCategory)) {
    return match[1] as ServiceCategory;
  }
  
  // If no category tag, try to determine from the name or description content
  const descLower = description.toLowerCase();
  if (descLower.includes('dry') || descLower.includes('clean')) {
    return 'DRY_CLEANING';
  } else if (descLower.includes('laundry') || descLower.includes('wash')) {
    return 'LAUNDRY';
  } else if (descLower.includes('alter') || descLower.includes('tailor')) {
    return 'ALTERATIONS';
  }
  
  return 'DRY_CLEANING';
};

// Function to get clean description without the category tag
const getCleanDescription = (description: string | null | undefined): string => {
  if (!description) return '';
  return description.replace(/\[CATEGORY:.*?\]/, '').trim();
};

// Function to determine category based on service name
const getServiceCategory = (name: string): string => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('dry') || nameLower.includes('clean')) {
    return 'DRY_CLEANING';
  } else if (nameLower.includes('laundry') || nameLower.includes('wash')) {
    return 'LAUNDRY';
  } else if (nameLower.includes('alter') || nameLower.includes('tailor')) {
    return 'ALTERATIONS';
  }
  return 'DRY_CLEANING';
};

export default function ProductManagement({ route }: ProductManagementProps) {
  const { businessId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceWithProducts[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Schema['Product']['type'] | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  
  // Get window dimensions for responsive layout
  const { width, height } = useWindowDimensions();
  
  // List of service names to display
  const [serviceNames, setServiceNames] = useState<string[]>([]);

  // Helper function to extract unique service names to use as categories
  const extractServiceNames = (services: ServiceWithProducts[]): string[] => {
    return services.map(s => s.service.name);
  };

  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [serviceModalMode, setServiceModalMode] = useState<'add' | 'edit'>('add');
  const [editingService, setEditingService] = useState<Schema['Service']['type'] | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceBasePrice, setNewServiceBasePrice] = useState('');

  useEffect(() => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is required');
      return;
    }
    
    fetchServicesAndProducts();
  }, [businessId]);
  
  const fetchServicesAndProducts = async () => {
    try {
      setLoading(true);

      const servicesResult = await client.models.Service.list({
        filter: { businessID: { eq: businessId } }
      });
      
      // Sort services by createdAt (oldest first)
      const servicesData = (servicesResult.data ?? []).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB; // ascending order (oldest first)
      });
      
      // For each service, fetch related products
      const servicesWithProducts: ServiceWithProducts[] = [];
      
      for (const service of servicesData) {
        const productsResult = await client.models.Product.list({
          filter: { serviceID: { eq: service.id } }
        });
        
        // Sort products by createdAt (oldest first)
        const sortedProducts = (productsResult.data ?? []).sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB; // ascending order (oldest first)
        });
        
        servicesWithProducts.push({
          service,
          products: sortedProducts
        });
      }
      
      setServices(servicesWithProducts);
      const names = extractServiceNames(servicesWithProducts);
      setServiceNames(names);
      
      // Set the first service as selected if we have services and none is selected
      if (names.length > 0 && (!selectedService || !names.includes(selectedService))) {
        setSelectedService(names[0]);
      }
    } catch (error) {
      console.error('Error fetching services and products:', error);
      Alert.alert('Error', 'Failed to fetch services and products');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveService = async () => {
    try {
      if (!newServiceName.trim()) {
        Alert.alert('Error', 'Service name is required');
        return;
      }

      const basePrice = parseFloat(newServiceBasePrice);
      if (isNaN(basePrice)) {
        Alert.alert('Error', 'Please enter a valid base price');
        return;
      }

      if (serviceModalMode === 'add') {
        // Create new service
        const result = await client.models.Service.create({
          name: newServiceName,
          description: newServiceDescription,
          basePrice,
          businessID: businessId as string,
          estimatedDuration: 60 // Default duration in minutes
        });
        
        if (result.errors) {
          console.error('Error creating service:', result.errors);
          Alert.alert('Error', 'Failed to create service');
          return;
        }
        
        Alert.alert('Success', 'Service created successfully');
      } else if (serviceModalMode === 'edit' && editingService) {
        // Update existing service
        const result = await client.models.Service.update({
          id: editingService.id,
          name: newServiceName,
          description: newServiceDescription,
          basePrice
        });
        
        if (result.errors) {
          console.error('Error updating service:', result.errors);
          Alert.alert('Error', 'Failed to update service');
          return;
        }
        
        Alert.alert('Success', 'Service updated successfully');
      }
      
      // Clear form and close modal
      resetServiceForm();
      setServiceModalVisible(false);
      
      // Refresh the services list
      fetchServicesAndProducts();
    } catch (error) {
      console.error('Error saving service:', error);
      Alert.alert('Error', 'Failed to save service');
    }
  };
  
  const resetServiceForm = () => {
    setNewServiceName('');
    setNewServiceDescription('');
    setNewServiceBasePrice('');
    setEditingService(null);
  };
  
  const handleEditService = (service: Schema['Service']['type']) => {
    setEditingService(service);
    setNewServiceName(service.name);
    setNewServiceDescription(service.description || '');
    setNewServiceBasePrice(service.basePrice.toString());
    setServiceModalMode('edit');
    setServiceModalVisible(true);
  };
  
  const handleAddNewService = () => {
    resetServiceForm();
    setServiceModalMode('add');
    setServiceModalVisible(true);
  };
  
  const handleDeleteService = async (serviceId: string) => {
    try {
      // Confirm deletion
      Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to delete this service? This will also delete all products associated with this service.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // First delete all products associated with this service
              const productsResult = await client.models.Product.list({
                filter: { serviceID: { eq: serviceId } }
              });
              
              if (productsResult.data) {
                for (const product of productsResult.data) {
                  await client.models.Product.delete({ id: product.id });
                }
              }
              
              // Then delete the service
              const result = await client.models.Service.delete({ id: serviceId });
              
              if (result.errors) {
                console.error('Error deleting service:', result.errors);
                Alert.alert('Error', 'Failed to delete service');
                return;
              }
              
              // Refresh the services list
              fetchServicesAndProducts();
              Alert.alert('Success', 'Service deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting service:', error);
      Alert.alert('Error', 'Failed to delete service');
    }
  };
  
  // We're no longer using default products as we're creating services individually
  
  const handleViewProductDetails = (product: Schema['Product']['type']) => {
    setSelectedProduct(product);
    setDetailModalVisible(true);
  };
  
  const handleEditProduct = (product: Schema['Product']['type']) => {
    setSelectedProduct(product);
    setNewProductName(product.name);
    setNewProductDescription(product.description || '');
    setNewProductPrice(product.price.toString());
    setNewProductImageUrl(product.imageUrl || '');
    setEditModalVisible(true);
  };
  
  const handleSaveProduct = async () => {
    try {
      const price = parseFloat(newProductPrice);
      if (isNaN(price)) {
        Alert.alert('Error', 'Please enter a valid price');
        return;
      }
      
      if (!newProductName.trim()) {
        Alert.alert('Error', 'Product name is required');
        return;
      }
      
      // Check if we're adding a new product or updating existing one
      if (!selectedProduct?.id) {
        // Adding a new product
        const serviceId = selectedProduct?.serviceID;
        if (!serviceId) {
          Alert.alert('Error', 'Service ID is missing');
          return;
        }
        
        // New product will be added to the end of the list as it will have the latest creation timestamp
        await client.models.Product.create({
          serviceID: serviceId,
          businessID: businessId as string,
          name: newProductName,
          description: newProductDescription,
          price,
          imageUrl: newProductImageUrl,
          inventory: 999, // Default inventory
          isActive: true
        });
        
        Alert.alert('Success', 'Product created successfully');
      } else {
        // Updating existing product
        await client.models.Product.update({
          id: selectedProduct.id,
          name: newProductName,
          description: newProductDescription,
          price,
          imageUrl: newProductImageUrl,
        });
        
        Alert.alert('Success', 'Product updated successfully');
      }
      
      setEditModalVisible(false);
      fetchServicesAndProducts(); // Refresh the list
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    }
  };
  
  const handleAddProduct = (serviceId: string) => {
    // Set up for adding a new product
    setNewProductName('');
    setNewProductDescription('');
    setNewProductPrice('');
    setNewProductImageUrl('');
    // Create a placeholder product with default values to avoid errors
    setSelectedProduct({ 
      id: '', 
      serviceID: serviceId,
      name: '',
      price: 0, // Add default price to avoid toFixed errors
      description: '',
      imageUrl: ''
    } as Schema['Product']['type']);
    setEditModalVisible(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    // Confirm before deleting
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.models.Product.delete({
                id: productId
              });
              fetchServicesAndProducts(); // Refresh the list
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const renderProductItem = ({ item }: { item: Schema['Product']['type'] }) => (
    <TouchableOpacity 
      style={[commonStyles.productItem, { width: (width / Math.floor(width / 180)) - 15 }]}
      onPress={() => handleViewProductDetails(item)}
    >
      {item.imageUrl && (
        <Image 
          source={{ uri: item.imageUrl }} 
          style={commonStyles.productImage} 
          resizeMode="cover"
        />
      )}
      <View style={commonStyles.productInfo}>
        <Text style={commonStyles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={commonStyles.productPrice}>${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</Text>
      </View>
      <View style={styles.productButtonsContainer}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering the parent onPress
            handleEditProduct(item);
          }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering the parent onPress
            handleDeleteProduct(item.id);
          }}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  const renderServiceItem = ({ item }: { item: ServiceWithProducts }) => {
    const { service, products } = item;
    
    // Only show the selected service
    if (service.name !== selectedService) {
      return null;
    }
    

    
    return (
      <View style={styles.serviceContainer}>
        <View style={styles.serviceHeaderContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{flex: 1}}
          >
            <View style={[styles.serviceHeader, { width: 'auto' }]}>
              <Text style={styles.serviceName}>{service.name}</Text>
            </View>
          </ScrollView>
          
          <View style={styles.serviceActionButtons}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditService(service)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteService(service.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.serviceInfoContainer}>
          <View style={styles.serviceInfoLeft}>
            <Text style={styles.serviceDescription}>{service.description}</Text>
            <Text style={styles.servicePrice}>Base Price: ${service.basePrice.toFixed(2)}</Text>
          </View>
          
          <View style={styles.serviceInfoRight}>
            {/* Add Product button */}
            <TouchableOpacity 
              style={styles.addProductButton}
              onPress={() => handleAddProduct(service.id)}
            >
              <Text style={styles.addProductButtonText}>+ Add New Product</Text>
            </TouchableOpacity>
          </View>
        </View>
        

        <Text style={styles.productsHeader}>Products:</Text>
      
        {products.length > 0 ? (
          <View style={styles.productsRow}>
            {products.map((product, index) => (
              <View key={product.id} style={[commonStyles.productItem, { width: (width / Math.floor(width / 180)) - 15 }]}>
                {product.imageUrl && (
                  <Image 
                    source={{ uri: product.imageUrl }} 
                    style={commonStyles.productImage} 
                    resizeMode="cover"
                  />
                )}
                <View style={commonStyles.productInfo}>
                  <Text style={commonStyles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={commonStyles.productPrice}>
                    ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
                  </Text>
                </View>
                
                <View style={styles.productButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditProduct(product)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProduct(product.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>

              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noProducts}>No products available</Text>
        )}
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading services and products...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Product Management</Text>
      
      {/* Add New Service button */}
      <TouchableOpacity 
        style={styles.addServiceButton}
        onPress={handleAddNewService}
      >
        <Text style={styles.addServiceButtonText}>+ Add New Service</Text>
      </TouchableOpacity>
      
      {/* Service tabs */}
      <View style={styles.categoryTabs}>
        {serviceNames.map((serviceName) => (
          <TouchableOpacity
            key={serviceName}
            style={[
              styles.categoryTab,
              selectedService === serviceName && styles.selectedCategoryTab
            ]}
            onPress={() => setSelectedService(serviceName)}
          >
            <Text 
              style={[
                styles.categoryTabText,
                selectedService === serviceName && styles.selectedCategoryTabText
              ]}
            >
              {serviceName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Services list */}
      <FlatList
        data={services}
        keyExtractor={(item) => item.service.id}
        renderItem={renderServiceItem}
        contentContainerStyle={styles.servicesList}
      />
      
      {/* Product Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalContent}>
            {selectedProduct && (
              <>
                <Text style={commonStyles.modalTitle}>{selectedProduct.name}</Text>
                
                {selectedProduct.imageUrl && (
                  <Image 
                    source={{ uri: selectedProduct.imageUrl }} 
                    style={commonStyles.modalImage} 
                    resizeMode="cover"
                  />
                )}
                
                <Text style={commonStyles.modalDescription}>{selectedProduct.description}</Text>
                <Text style={commonStyles.modalPrice}>${selectedProduct.price.toFixed(2)}</Text>
                
                <View style={commonStyles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[commonStyles.modalButton, commonStyles.closeButton]}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Text style={commonStyles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[commonStyles.modalButton, commonStyles.actionButton]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleEditProduct(selectedProduct);
                    }}
                  >
                    <Text style={commonStyles.modalButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Service Modal (Add/Edit) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={serviceModalVisible}
        onRequestClose={() => setServiceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{serviceModalMode === 'add' ? 'Add New Service' : 'Edit Service'}</Text>
            
            <Text style={styles.inputLabel}>Service Name:</Text>
            <TextInput
              style={styles.input}
              value={newServiceName}
              onChangeText={setNewServiceName}
              placeholder="Enter service name"
            />
            
            <Text style={styles.inputLabel}>Description:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newServiceDescription}
              onChangeText={setNewServiceDescription}
              placeholder="Enter service description"
              multiline
            />
            
            <Text style={styles.inputLabel}>Base Price ($):</Text>
            <TextInput
              style={styles.input}
              value={newServiceBasePrice}
              onChangeText={setNewServiceBasePrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            
            {/* Category selection removed - will be handled in service header section */}
            
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setServiceModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveService}
              >
                <Text style={styles.modalButtonText}>{serviceModalMode === 'add' ? 'Create Service' : 'Update Service'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedProduct?.id ? 'Edit Product' : 'Add New Product'}</Text>
            
            <Text style={styles.inputLabel}>Name:</Text>
            <TextInput
              style={styles.input}
              value={newProductName}
              onChangeText={setNewProductName}
              placeholder="Product name"
            />
            
            <Text style={styles.inputLabel}>Description:</Text>
            <TextInput
              style={styles.input}
              value={newProductDescription}
              onChangeText={setNewProductDescription}
              placeholder="Product description"
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.inputLabel}>Price:</Text>
            <TextInput
              style={styles.input}
              value={newProductPrice}
              onChangeText={setNewProductPrice}
              placeholder="Price"
              keyboardType="numeric"
            />
            
            <Text style={styles.inputLabel}>Image URL:</Text>
            <TextInput
              style={styles.input}
              value={newProductImageUrl}
              onChangeText={setNewProductImageUrl}
              placeholder="Image URL"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
