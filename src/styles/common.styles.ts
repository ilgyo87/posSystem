import { StyleSheet, Dimensions, Platform } from 'react-native';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Calculate number of columns based on screen width and orientation
// This will adjust automatically when orientation changes
const getNumColumns = () => {
  const isLandscape = width > height;
  
  if (isLandscape) {
    if (width >= 1024) return 6; // Large tablets, landscape
    if (width >= 768) return 5;  // Tablets, landscape
    if (width >= 480) return 4;  // Large phones, landscape
    return 3;                    // Small phones, landscape
  } else {
    if (width >= 1024) return 5; // Large tablets, portrait
    if (width >= 768) return 4;  // Tablets, portrait
    if (width >= 480) return 3;  // Large phones, portrait
    return 2;                    // Small phones, portrait
  }
};

// Calculate item width based on number of columns with spacing
const getItemWidth = () => {
  const numColumns = getNumColumns();
  const spacing = 10; // Gap between items
  return (width - (spacing * (numColumns + 1))) / numColumns;
};

export const commonStyles = StyleSheet.create({
  // Grid layout for products
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 5,
  },
  productItem: {
    // Width will be set dynamically in component
    marginBottom: 15,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 200, // Ensure consistent height
    justifyContent: 'space-between',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#f9f9f9', // Light background for image placeholder
  },
  productInfo: {
    alignItems: 'center',
    padding: 4,
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
    height: 20, // Fixed height for consistent layout
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
  },
  // Modal for product details
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: Platform.OS === 'web' ? '50%' : '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  closeButton: {
    backgroundColor: '#f44336',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
  },
  // Additional styles for responsive grid
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    marginHorizontal: 15,
    color: '#333',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
