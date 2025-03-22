import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import styles from '../../../styles/components/OrderDetails/OrderDetailsStyles';
import { ScannedItemListProps } from './types';

const ScannedItemList: React.FC<ScannedItemListProps> = ({ 
  garments, 
  onEditGarment,
  onDeleteGarment,
  enableEditing = true
}) => {
  return (
    <View style={styles.scannedItemsSection}>
      <Text style={styles.sectionTitle}>Scanned Items</Text>
      <FlatList
        data={garments}
        keyExtractor={(item) => item.id || `garment-${item.qrCode}`}
        renderItem={({ item }) => (
          <View style={styles.scannedItemRow}>
            <View style={styles.scannedItemInfo}>
              <Text style={styles.scannedItemCode}>QR: {item.qrCode}</Text>
              <Text style={styles.scannedItemDescription}>{item.description || 'No description'}</Text>
            </View>
            
            {enableEditing && (
              <View style={styles.scannedItemActions}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => onEditGarment && onEditGarment(item)}
                >
                  <FontAwesome name="edit" size={18} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.iconButton, styles.deleteButton]}
                  onPress={() => onDeleteGarment && onDeleteGarment(item)}
                >
                  <FontAwesome name="trash" size={18} color="#cc0000" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyListMessage}>
            <Text style={styles.emptyListText}>No items scanned yet</Text>
          </View>
        }
      />
    </View>
  );
};

export default ScannedItemList; 