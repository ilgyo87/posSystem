import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  StyleSheet
} from 'react-native';
import styles from '../Common/OrderDetailsStyles';
import { EditGarmentModalProps } from '../Common/types';

// Local styles for components not in the shared styles
const localStyles = StyleSheet.create({
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#555',
  },
  qrCodeDisplay: {
    fontSize: 16,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4caf50',
  }
});

const EditGarmentModal: React.FC<EditGarmentModalProps> = ({ 
  visible, 
  garment, 
  onSave, 
  onClose 
}) => {
  const [description, setDescription] = useState(garment?.description || '');
  const [notes, setNotes] = useState(garment?.notes || '');

  const handleSave = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Description cannot be empty');
      return;
    }
    
    if (garment) {
      onSave({
        ...garment,
        description: description.trim(),
        notes: notes.trim()
      });
    }
    
    // Reset form
    setDescription('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Garment Details</Text>
          
          <Text style={localStyles.inputLabel}>QR Code</Text>
          <Text style={localStyles.qrCodeDisplay}>{garment?.qrCode || 'N/A'}</Text>
          
          <Text style={localStyles.inputLabel}>Description</Text>
          <TextInput
            style={localStyles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter garment description"
            multiline
          />
          
          <Text style={localStyles.inputLabel}>Notes</Text>
          <TextInput
            style={[localStyles.textInput, localStyles.textAreaInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this garment"
            multiline
            numberOfLines={4}
          />
          
          <View style={localStyles.modalButtonRow}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                // Reset form
                setDescription(garment?.description || '');
                setNotes(garment?.notes || '');
                onClose();
              }}
            >
              <Text style={localStyles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, localStyles.saveButton]}
              onPress={handleSave}
              disabled={!description.trim()}
            >
              <Text style={localStyles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditGarmentModal; 