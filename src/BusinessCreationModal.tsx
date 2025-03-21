import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import BusinessCreate from './BusinessCreate';
import type { Schema } from '../amplify/data/resource';
import { clearBusinessData } from './utils/storage';

interface BusinessCreationModalProps {
  visible: boolean;
  onBusinessCreated: (business: Schema['Business']['type']) => void;
  isLoading: boolean;
}

export default function BusinessCreationModal({ 
  visible, 
  onBusinessCreated, 
  isLoading 
}: BusinessCreationModalProps) {
  // Function to handle clearing business data
  const handleClearStorage = async () => {
    Alert.alert(
      "Clear Business Data",
      "This will clear all stored business data. This is useful when switching between sandboxes or for testing. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear Data", 
          style: "destructive",
          onPress: async () => {
            try {
              await clearBusinessData();
              Alert.alert("Success", "Business data cleared from storage");
            } catch (error) {
              console.error("Error clearing business data:", error);
              Alert.alert("Error", "Failed to clear business data");
            }
          }
        }
      ]
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create Your Business</Text>
          <Text style={styles.modalText}>
            Please create a business to continue using the app.
          </Text>
          <BusinessCreate 
            onBusinessCreated={onBusinessCreated} 
            isLoading={isLoading}
          />
          
          {/* Developer tools section - always visible for now */}
          <View style={styles.devToolsContainer}>
            <Text style={styles.devToolsTitle}>Developer Tools</Text>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearStorage}
            >
              <Text style={styles.clearButtonText}>Clear Stored Business Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center'
  },
  devToolsContainer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    width: '100%',
    alignItems: 'center'
  },
  devToolsTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10
  },
  clearButton: {
    backgroundColor: '#f8d7da',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#f5c6cb'
  },
  clearButtonText: {
    color: '#721c24',
    fontSize: 12
  }
});
