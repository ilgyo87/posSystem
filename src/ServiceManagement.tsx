import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { generateClient } from 'aws-amplify/data';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Schema } from '../amplify/data/resource';
import type { RootStackParamList } from '../src/types';

const client = generateClient<Schema>();

type ServiceType = Schema['Service']['type'];
type ServiceCreateInput = Schema['Service']['createType'];
type ServiceManagementProps = NativeStackScreenProps<RootStackParamList, 'ServiceManagement'>;

export default function ServiceManagement({ route }: ServiceManagementProps) {
  const { businessId } = route.params;
  const [services, setServices] = useState<ServiceType[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const result = await client.models.Service.list({
        filter: { businessID: { eq: businessId } }
      });
      if (result.errors) {
        console.error('Errors fetching services:', result.errors);
        return;
      }
      setServices(result.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to fetch services');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setBasePrice('');
    setEstimatedDuration('');
    setEditingService(null);
  };

  const handleSubmit = async () => {
    if (!name || !basePrice || !estimatedDuration) {
      Alert.alert('Error', 'Please fill out all required fields');
      return;
    }

    if (!businessId) {
      Alert.alert('Error', 'Business ID is required');
      return;
    }

    try {
      const serviceData = {
        businessID: businessId,
        name,
        description,
        basePrice: parseFloat(basePrice),
        estimatedDuration: parseInt(estimatedDuration),
      };

      if (editingService) {
        // Update existing service
        const result = await client.models.Service.update({
          id: editingService.id,
          ...serviceData,
        });
        if (result.errors) {
          Alert.alert('Error updating service', JSON.stringify(result.errors));
          return;
        }
        Alert.alert('Success', 'Service updated successfully');
      } else {
        // Create new service
        const result = await client.models.Service.create(serviceData);
        if (result.errors) {
          Alert.alert('Error creating service', JSON.stringify(result.errors));
          return;
        }
        Alert.alert('Success', 'Service created successfully');
      }

      resetForm();
      setModalVisible(false);
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      Alert.alert('Error', 'Failed to save service');
    }
  };

  const handleEdit = (service: ServiceType) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setBasePrice(service.basePrice.toString());
    setEstimatedDuration(service.estimatedDuration.toString());
    setModalVisible(true);
  };

  const handleDelete = async (serviceId: string) => {
    try {
      const result = await client.models.Service.delete({
        id: serviceId
      });
      if (result.errors) {
        Alert.alert('Error deleting service', JSON.stringify(result.errors));
        return;
      }
      Alert.alert('Success', 'Service deleted successfully');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      Alert.alert('Error', 'Failed to delete service');
    }
  };

  const renderItem = ({ item }: { item: ServiceType }) => {
    return (
      <View style={styles.serviceItem}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text>Price: ${item.basePrice.toFixed(2)}</Text>
          <Text>Duration: {item.estimatedDuration} minutes</Text>
          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}
        </View>
        <View style={styles.serviceActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              Alert.alert(
                'Confirm Delete',
                `Are you sure you want to delete ${item.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', onPress: () => handleDelete(item.id), style: 'destructive' }
                ]
              );
            }}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Service Management</Text>
        <Button title="Add Service" onPress={() => setModalVisible(true)} />
      </View>

      <FlatList
        data={services}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Service Name"
              value={name}
              onChangeText={setName}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Base Price ($)"
              value={basePrice}
              onChangeText={setBasePrice}
              keyboardType="decimal-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Estimated Duration (minutes)"
              value={estimatedDuration}
              onChangeText={setEstimatedDuration}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  serviceItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceInfo: {
    flex: 1,
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: '#666',
    marginTop: 4,
  },
  serviceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    padding: 12,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
});
