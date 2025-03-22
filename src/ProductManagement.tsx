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
import { defaultServices, defaultProducts } from './data/defaultData';
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
  } else if (nameLower.includes('fold')) {
    return 'WASH_AND_FOLD';
  } else if (nameLower.includes('press')) {
    return 'PRESSING';
  } else if (nameLower.includes('repair')) {
    return 'REPAIRS';
  } else if (nameLower.includes('specialty')) {
    return 'SPECIALTY';
  }
  return 'DRY_CLEANING';
};

export default function ProductManagement({ route }: ProductManagementProps) {
  const { businessId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceWithProducts[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('DRY_CLEANING');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Schema['Product']['type'] | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');
  
  // Get window dimensions for responsive layout
  const { width, height } = useWindowDimensions();
  
  // Default service categories
  const serviceCategories: ServiceCategory[] = ['DRY_CLEANING', 'LAUNDRY', 'ALTERATIONS'];
  
  useEffect(() => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is required');
      return;
    }
    
    fetchServicesAndProducts();
  }, [businessId]);
  
  const fetchServicesAndProducts = async () => {
    setLoading(true);
    try {
      // Fetch services for this business
      const servicesResult = await client.models.Service.list({
        filter: { businessID: { eq: businessId as string } }
      });
      
      if (servicesResult.errors) {
        console.error('Error fetching services:', servicesResult.errors);
        Alert.alert('Error', 'Failed to fetch services');
        setLoading(false);
        return;
      }
      
      const servicesData = servicesResult.data ?? [];
      
      // If no services exist, create default services
      if (servicesData.length === 0) {
        await createDefaultServices();
        // Fetch again after creating defaults
        fetchServicesAndProducts();
        return;
      }
      
      // For each service, fetch related products
      const servicesWithProducts: ServiceWithProducts[] = [];
      
      for (const service of servicesData) {
        // Fetch products for this service
        const productsResult = await client.models.Product.list({
          filter: { serviceID: { eq: service.id } }
        });
        
        if (productsResult.errors) {
          console.error('Error fetching products for service:', service.id, productsResult.errors);
          continue;
        }
        
        servicesWithProducts.push({
          service,
          products: productsResult.data ?? []
        });
      }
      
      setServices(servicesWithProducts);
    } catch (error) {
      console.error('Error fetching services and products:', error);
      Alert.alert('Error', 'Failed to fetch services and products');
    } finally {
      setLoading(false);
    }
  };
  
  const createDefaultServices = async () => {
    try {
      // Create default services using the imported data
      for (const serviceData of defaultServices) {
        // Include description with category tag to make filtering accurate
        const serviceName = serviceData.name;
        // Determine category using our utility function
        const category = getServiceCategory(serviceName);
        
        // Create a version of service data without the category field for the API
        const { category: categoryField, ...serviceDataWithoutCategory } = serviceData;
        
        // Add category tag to description for consistent filtering
        const descriptionWithCategory = `[CATEGORY:${category}] ${serviceDataWithoutCategory.description}`;
        
        const result = await client.models.Service.create({
          ...serviceDataWithoutCategory,
          description: descriptionWithCategory,
          businessID: businessId as string
        });
        
        if (result.errors) {
          console.error('Error creating default service:', result.errors);
          continue;
        }
        
        // Create default products for each service
        if (result.data?.id) {
          await createDefaultProducts(result.data.id, category);
        } else {
          console.error('Error: Service ID is undefined');
        }
      }
      
      Alert.alert('Success', 'Default services and products created');
    } catch (error) {
      console.error('Error creating default services:', error);
      Alert.alert('Error', 'Failed to create default services');
    }
  };
  
  const createDefaultProducts = async (serviceId: string, category: string) => {
    try {
      // Get products from the imported defaultProducts based on category
      const productsForCategory = defaultProducts[category as keyof typeof defaultProducts] || [];
      
      // Create each product
      for (const productData of productsForCategory) {
        await client.models.Product.create({
          serviceID: serviceId,
          businessID: businessId as string,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          imageUrl: productData.imageUrl,
          inventory: 999, // Unlimited inventory for services
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error creating default products:', error);
    }
  };
  
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
    if (!selectedProduct) return;
    
    try {
      const price = parseFloat(newProductPrice);
      if (isNaN(price)) {
        Alert.alert('Error', 'Please enter a valid price');
        return;
      }
      
      await client.models.Product.update({
        id: selectedProduct.id,
        name: newProductName,
        description: newProductDescription,
        price,
        imageUrl: newProductImageUrl,
      });
      
      setEditModalVisible(false);
      fetchServicesAndProducts(); // Refresh the list
      Alert.alert('Success', 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product');
    }
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
        <Text style={commonStyles.productPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={(e) => {
          e.stopPropagation(); // Prevent triggering the parent onPress
          handleEditProduct(item);
        }}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  const renderServiceItem = ({ item }: { item: ServiceWithProducts }) => {
    const { service, products } = item;
    
    // Determine service category based on the service name
    const serviceCategory = service.name.toLowerCase().includes('wash') || 
                           service.name.toLowerCase().includes('laundry') 
      ? 'LAUNDRY'
      : service.name.toLowerCase().includes('dry') || service.name.toLowerCase().includes('clean')
      ? 'DRY_CLEANING'
      : service.name.toLowerCase().includes('alter') || service.name.toLowerCase().includes('tailor')
      ? 'ALTERATIONS'
      : 'DRY_CLEANING';
    
    // Only show services that match the selected category
    if (serviceCategory !== selectedCategory) {
      return null;
    }
    
    return (
      <View style={styles.serviceContainer}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{service.name}</Text>
        </View>
        
        <Text style={styles.serviceDescription}>{service.description}</Text>
        <Text style={styles.servicePrice}>Base Price: ${service.basePrice.toFixed(2)}</Text>
        
        <Text style={styles.productsHeader}>Products:</Text>
        
        {products.length > 0 ? (
          <View style={commonStyles.productsGrid}>
            {products.map((product) => (
              <React.Fragment key={product.id}>
                {renderProductItem({ item: product })}
              </React.Fragment>
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
      
      {/* Service category tabs */}
      <View style={styles.categoryTabs}>
        {serviceCategories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.selectedCategoryTab
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text 
              style={[
                styles.categoryTabText,
                selectedCategory === category && styles.selectedCategoryTabText
              ]}
            >
              {category.replace('_', ' ')}
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
      
      {/* Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            
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
