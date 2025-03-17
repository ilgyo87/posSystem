import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  useWindowDimensions
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { defaultServices, defaultProducts } from './data/defaultData';
import { commonStyles } from './styles/common.styles';
import { generateClient } from 'aws-amplify/data';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';

const client = generateClient<Schema>();

// Define types for our cart items
type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'service' | 'product';
  serviceId?: string; // For products, to track which service they belong to
  imageUrl?: string | null; // Add image URL for products
};

// Define service category type
type ServiceCategory = 'DRY_CLEANING' | 'LAUNDRY' | 'ALTERATIONS';

// Define service with products
type ServiceWithProducts = {
  service: Schema['Service']['type'];
  products: Schema['Product']['type'][];
};

type ProductSelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'ProductSelection'>;

export default function ProductSelectionScreen({ route, navigation }: ProductSelectionScreenProps) {
  const { businessId, customerId, customerName } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceWithProducts[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('DRY_CLEANING');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Schema['Product']['type'] | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [customerPreferences, setCustomerPreferences] = useState<string>('');
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [tempNotes, setTempNotes] = useState<string>('');
  
  // Get window dimensions for responsive layout
  const { width, height } = useWindowDimensions();
  
  // Set default pickup date (3 days from now)
  const getDefaultPickupDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date;
  };
  
  const [pickupDate, setPickupDate] = useState<Date>(getDefaultPickupDate());
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Default service categories from types
  const serviceCategories: ServiceCategory[] = ['DRY_CLEANING', 'LAUNDRY', 'ALTERATIONS'];
  
  useEffect(() => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is required');
      navigation.goBack();
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
        const result = await client.models.Service.create({
          ...serviceData,
          businessID: businessId as string
        });
        
        if (result.errors) {
          console.error('Error creating default service:', result.errors);
          continue;
        }
        
        // Create default products for each service
        if (result.data?.id) {
          await createDefaultProducts(result.data.id, serviceData.category);
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
  
  const addToCart = (item: Schema['Service']['type'] | Schema['Product']['type'], type: 'service' | 'product', serviceId?: string) => {
    // Check if item is already in cart
    const existingItemIndex = cart.findIndex(
      cartItem => cartItem.id === item.id && cartItem.type === type
    );
    
    if (existingItemIndex >= 0) {
      // Item exists, update quantity
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      // Add new item to cart
      setCart([
        ...cart,
        {
          id: item.id,
          name: item.name,
          price: type === 'service' ? (item as Schema['Service']['type']).basePrice : (item as Schema['Product']['type']).price,
          quantity: 1,
          type,
          serviceId: type === 'product' ? serviceId : undefined,
          imageUrl: type === 'product' ? (item as Schema['Product']['type']).imageUrl : null
        }
      ]);
    }
  };
  
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };
  
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(
      cart.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };
  
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };
  
  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Please add items to your cart before proceeding');
      return;
    }
    
    // Navigate to checkout/order confirmation screen
    Alert.alert(
      'Proceed to Checkout',
      `Total: $${calculateTotal().toFixed(2)}\nPickup Date: ${formatDate(pickupDate)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => {
            // Here you would navigate to the checkout screen
            // For now, just show a success message
            Alert.alert('Success', 'Order created successfully');
            navigation.navigate('Dashboard', { 
              businessId: businessId as string,
            });
          }
        }
      ]
    );
  };
  
  const renderServiceItem = ({ item }: { item: ServiceWithProducts }) => {
    const { service, products } = item;
    
    // Only show services that match the selected category
    if (service.category !== selectedCategory) {
      return null;
    }
    
    return (
      <View style={styles.serviceContainer}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => addToCart(service, 'service')}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.serviceDescription}>{service.description}</Text>
        <Text style={styles.servicePrice}>Base Price: ${service.basePrice.toFixed(2)}</Text>
        
        <Text style={styles.productsHeader}>Products:</Text>
        
        {products.length > 0 ? (
          <View style={commonStyles.productsGrid}>
            {products.map((product) => (
              <TouchableOpacity 
                key={product.id}
                style={[commonStyles.productItem, { width: (width / Math.floor(width / 180)) - 15 }]}
                onPress={() => handleViewProductDetails(product)}
              >
                {product.imageUrl && (
                  <Image 
                    source={{ uri: product.imageUrl }} 
                    style={commonStyles.productImage} 
                    resizeMode="cover"
                  />
                )}
                <View style={commonStyles.productInfo}>
                  <Text style={commonStyles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={commonStyles.productPrice}>${product.price.toFixed(2)}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onPress
                    addToCart(product, 'product', service.id);
                  }}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.noProducts}>No products available</Text>
        )}
        
        {/* Pickup Date Selection */}
        <View style={styles.pickupDateSection}>
          <Text style={styles.pickupDateTitle}>Pickup Date</Text>
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => setCalendarVisible(true)}
          >
            <Text style={styles.dateText}>{formatDate(pickupDate)}</Text>
          </TouchableOpacity>
          <Text style={styles.pickupInstructions}>Tap to change pickup date</Text>
        </View>
      </View>
    );
  };
  
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      {item.imageUrl && item.type === 'product' && (
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.cartItemImage} 
          resizeMode="cover"
        />
      )}
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      
      <View style={styles.quantityContainer}>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.cartItemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeFromCart(item.id)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
  
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
      {/* Customer info header */}
      <View style={styles.customerHeader}>
        <View style={styles.customerInfoRow}>
          <Text style={styles.customerName}>Customer: {customerName}</Text>
          <TouchableOpacity 
            style={styles.addNotesButton}
            onPress={() => {
              setTempNotes(customerPreferences);
              setNotesModalVisible(true);
            }}
          >
            <Text style={styles.addNotesButtonText}>{customerPreferences ? 'Edit Notes' : 'Add Notes'}</Text>
          </TouchableOpacity>
        </View>
        
        {customerPreferences ? (
          <View style={styles.preferencesBanner}>
            <Text style={styles.preferencesTitle}>Customer Preferences:</Text>
            <Text style={styles.preferencesText}>{customerPreferences}</Text>
          </View>
        ) : null}
      </View>
      
      {/* Main content area */}
      <View style={styles.content}>
        {/* Left side - Services and Products */}
        <View style={styles.servicesContainer}>
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
        </View>
        

        
        {/* Right side - Cart */}
        <View style={styles.cartContainer}>
          <Text style={styles.cartTitle}>Order Summary</Text>
          
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>Add items from the left panel</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                keyExtractor={(item) => `${item.id}-${item.type}`}
                renderItem={renderCartItem}
                style={styles.cartList}
              />
              
              <View style={styles.cartFooter}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.checkoutButton}
                  onPress={handleCheckout}
                >
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
      
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
                      addToCart(selectedProduct, 'product', selectedProduct.serviceID);
                    }}
                  >
                    <Text style={commonStyles.modalButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Calendar Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={commonStyles.modalContainer}>
          <View style={[commonStyles.modalContent, styles.calendarModalContent]}>
            <Text style={commonStyles.modalTitle}>Select Pickup Date</Text>
            
            <Calendar
              onDayPress={(day: {year: number; month: number; day: number; timestamp: number; dateString: string}) => {
                const selectedDate = new Date(day.timestamp);
                setPickupDate(selectedDate);
                setCalendarVisible(false);
              }}
              markedDates={{
                [pickupDate.toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: '#4CAF50',
                }
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                todayTextColor: '#00adf5',
                selectedDayBackgroundColor: '#4CAF50',
                selectedDayTextColor: '#ffffff',
              }}
            />
            
            <View style={commonStyles.modalButtonsRow}>
              <TouchableOpacity
                style={[commonStyles.modalButton, commonStyles.closeButton]}
                onPress={() => setCalendarVisible(false)}
              >
                <Text style={commonStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Customer Notes Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notesModalVisible}
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalContent}>
            <Text style={commonStyles.modalTitle}>Customer Preferences</Text>
            
            <TextInput
              style={styles.notesInput}
              value={tempNotes}
              onChangeText={setTempNotes}
              placeholder="Enter customer preferences (allergies, special handling instructions, etc.)"
              multiline
              numberOfLines={4}
            />
            
            <View style={commonStyles.modalButtonsRow}>
              <TouchableOpacity
                style={[commonStyles.modalButton, commonStyles.closeButton]}
                onPress={() => setNotesModalVisible(false)}
              >
                <Text style={commonStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[commonStyles.modalButton, commonStyles.actionButton]}
                onPress={() => {
                  setCustomerPreferences(tempNotes);
                  setNotesModalVisible(false);
                }}
              >
                <Text style={commonStyles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  pickupDateSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  pickupDateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  dateSelector: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickupInstructions: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  calendarModalContent: {
    padding: 10,
    width: '95%',
    maxWidth: 350,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  customerHeader: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  customerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addNotesButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addNotesButtonText: {
    fontSize: 14,
    color: '#555',
  },
  preferencesBanner: {
    backgroundColor: '#f9f4e8',
    borderRadius: 6,
    padding: 10,
    marginTop: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#f0c14b',
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  preferencesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginVertical: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  servicesContainer: {
    flex: 2,
    borderRightWidth: 1,
    borderRightColor: '#e1e1e1',
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  categoryTab: {
    padding: 15,
    flex: 1,
    alignItems: 'center',
  },
  selectedCategoryTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  categoryTabText: {
    fontSize: 16,
    color: '#666',
  },
  selectedCategoryTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  servicesList: {
    padding: 15,
  },
  serviceContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
  },
  productsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555',
  },
  productItem: {
    flexDirection: 'column',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  noProducts: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cartContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#999',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    width: 70,
    textAlign: 'right',
  },
  removeButton: {
    marginLeft: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    marginTop: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
