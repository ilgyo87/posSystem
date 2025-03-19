import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Button } from './Button';
import type { Schema } from '../../amplify/data/resource';

interface ScannedItemProps {
  item: Schema['Garment']['type'];
  onUploadImage: (item: Schema['Garment']['type']) => void;
  onDeleteImage: (item: Schema['Garment']['type']) => void;
}

export const ScannedItem: React.FC<ScannedItemProps> = ({
  item,
  onUploadImage,
  onDeleteImage,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.description}>{item.description}</Text>
          {item.lastScanned && (
            <Text style={styles.timestamp}>
              Scanned: {new Date(item.lastScanned).toLocaleString()}
            </Text>
          )}
        </View>
        <View style={styles.imageActions}>
          {item.imageUrl ? (
            <>
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.image} 
              />
              <Button
                title="Delete Image"
                variant="danger"
                onPress={() => onDeleteImage(item)}
                style={styles.deleteButton}
              />
            </>
          ) : (
            <Button
              title="Add Photo"
              onPress={() => onUploadImage(item)}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  imageActions: {
    marginLeft: 8,
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginBottom: 4,
  },
  deleteButton: {
    padding: 4,
  },
}); 