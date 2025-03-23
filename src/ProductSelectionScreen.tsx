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
import Svg, { Path } from 'react-native-svg';
import { Calendar } from 'react-native-calendars';
// Default data now handled in Dashboard
import { commonStyles } from './styles/common.styles';
import { client } from './amplifyConfig';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from './types';

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
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Schema['Product']['type'] | null>(null);
  const [currentProductPage, setCurrentProductPage] = useState(0); // Track current page of products
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
  
  // Reset product page when changing services
  useEffect(() => {
    setCurrentProductPage(0);
  }, [selectedServiceIndex]);
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
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
      
      // No need to create default services, they're now created in Dashboard
      if (servicesData.length === 0) {
        setLoading(false);
        Alert.alert('No Services', 'No services found for this business. Please check with your administrator.');
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
        
        // Sort products by createdAt date (oldest first)
        const sortedProducts = [...(productsResult.data ?? [])].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB; // Ascending order (oldest first)
        });
        
        servicesWithProducts.push({
          service,
          products: sortedProducts
        });
      }
      
      // Sort services by createdAt date (oldest first) to match ProductManagement screen
      const sortedServices = [...servicesWithProducts].sort((a, b) => {
        const dateA = a.service.createdAt ? new Date(a.service.createdAt).getTime() : 0;
        const dateB = b.service.createdAt ? new Date(b.service.createdAt).getTime() : 0;
        return dateA - dateB; // Ascending order (oldest first)
      });
      
      setServices(sortedServices);
    } catch (error) {
      console.error('Error fetching services and products:', error);
      Alert.alert('Error', 'Failed to fetch services and products');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProductDetails = (product: Schema['Product']['type']) => {
    // Add to cart directly instead of showing details
    addToCart(product, 'product', product.serviceID);
  };
  
  const addToCart = (item: Schema['Service']['type'] | Schema['Product']['type'], type: 'service' | 'product', serviceId?: string) => {
    // Check if item already exists in cart
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
    
    // Prepare cart items for checkout screen
    const checkoutItems = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      type: item.type,
      serviceId: item.serviceId,
      imageUrl: item.imageUrl
    }));
    
    // Navigate to checkout screen
    navigation.navigate('Checkout', {
      businessId: businessId as string,
      customerId: customerId as string,
      customerName: customerName,
      items: checkoutItems,
      total: calculateTotal(),
      pickupDate: pickupDate.toISOString(),
      customerPreferences: customerPreferences
    });
  };
  
  const renderServiceTabs = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {services.map((serviceItem, index) => (
          <TouchableOpacity
            key={serviceItem.service.id}
            style={[
              styles.tabItem,
              selectedServiceIndex === index && styles.tabItemActive
            ]}
            onPress={() => setSelectedServiceIndex(index)}
          >
            <Text 
              style={[
                styles.tabText,
                selectedServiceIndex === index && styles.tabTextActive
              ]}
            >
              {serviceItem.service.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderSelectedServiceContent = () => {
    if (services.length === 0) return null;
    
    const { service, products } = services[selectedServiceIndex];
    
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
        
            {service.description && (
              <Text style={styles.serviceDescription}>{service.description}</Text>
            )}
            <Text style={styles.servicePrice}>Base Price: ${service.basePrice.toFixed(2)}</Text>
        
        <Text style={styles.productsHeader}>Products:</Text>
        
        {products.length > 0 ? (
          <>
            <View style={styles.fixedProductsGrid}>
              <View style={styles.productRow}>
                {products.slice(currentProductPage * 8, currentProductPage * 8 + 4).map((product) => (
                  <TouchableOpacity 
                    key={product.id}
                    style={[commonStyles.productItem, styles.fixedProductItem]}
                    onPress={() => {
                      addToCart(product, 'product', product.serviceID);
                    }}
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
                      <Text style={styles.largePrice}>${product.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.productRow}>
                {products.slice(currentProductPage * 8 + 4, currentProductPage * 8 + 8).map((product) => (
                  <TouchableOpacity 
                    key={product.id}
                    style={[commonStyles.productItem, styles.fixedProductItem]}
                    onPress={() => {
                      addToCart(product, 'product', product.serviceID);
                    }}
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
                      <Text style={styles.largePrice}>${product.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
                </View>
                
            {/* Pagination Navigation */}
            {products.length > 8 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity 
                  style={[styles.paginationArrow, currentProductPage === 0 && styles.paginationArrowDisabled]}
                  onPress={() => setCurrentProductPage(prev => Math.max(0, prev - 1))}
                  disabled={currentProductPage === 0}
                >
                  <Text style={[styles.paginationArrowText, currentProductPage === 0 && styles.paginationArrowTextDisabled]}>←</Text>
                </TouchableOpacity>
                
                <Text style={styles.paginationText}>
                  {currentProductPage + 1} / {Math.ceil(products.length / 8)}
                </Text>
                
                <TouchableOpacity 
                  style={[styles.paginationArrow, currentProductPage >= Math.ceil(products.length / 8) - 1 && styles.paginationArrowDisabled]}
                  onPress={() => setCurrentProductPage(prev => Math.min(Math.ceil(products.length / 8) - 1, prev + 1))}
                  disabled={currentProductPage >= Math.ceil(products.length / 8) - 1}
                >
                  <Text style={[styles.paginationArrowText, currentProductPage >= Math.ceil(products.length / 8) - 1 && styles.paginationArrowTextDisabled]}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
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
            <View style={styles.dateTextContainer}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M19 4H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h-5v5h5v-5z" />
              </Svg>
              <Text style={styles.dateText}>{formatDate(pickupDate)}</Text>
            </View>
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
          {/* Services tabs */}
          {renderServiceTabs()}
          
          {/* Selected service content */}
          <ScrollView 
            style={[styles.serviceContentContainer, { height: height * 0.8 }]} 
            showsVerticalScrollIndicator={true}
          >
            {renderSelectedServiceContent()}
          </ScrollView>
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
                // Directly construct the date from year, month, day components to avoid timezone issues
                // Note: JavaScript months are 0-indexed, so we subtract 1 from the month
                const selectedDate = new Date(day.year, day.month - 1, day.day, 12, 0, 0, 0);
                
                // Update the pickup date
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
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    elevation: 1,
  },
  tabsContent: {
    flexDirection: 'row',
    flexGrow: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  serviceContentContainer: {
    backgroundColor: '#fff',
  },
  servicesList: {
    flex: 1,
    padding: 15,
  },
  serviceContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 15,
  },
  fixedProductsGrid: {
    width: '100%',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 10,
  },
  fixedProductItem: {
    width: '22%',
    margin: 0,
  },
  largePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  paginationArrow: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  paginationArrowDisabled: {
    backgroundColor: '#cccccc',
  },
  paginationArrowText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  paginationArrowTextDisabled: {
    color: '#999999',
  },
  paginationText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 10,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  productsHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
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
