import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import styles from '../Common/OrderDetailsStyles';
import { QRPrintModalProps } from '../Common/types';

const QRPrintModal: React.FC<QRPrintModalProps> = ({ 
  visible, 
  qrCodesToPrint, 
  onClose, 
  onPrint 
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, styles.printModalContent]}>
          <Text style={styles.modalTitle}>QR Codes Ready to Print ({qrCodesToPrint.length})</Text>
          
          <FlatList
            data={qrCodesToPrint}
            keyExtractor={(_, index) => `qr-code-${index}`}
            renderItem={({ item }) => (
              <View style={styles.qrPreviewItem}>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={item.qrCode}
                    size={120}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
                <Text style={styles.qrDescription}>{item.description}</Text>
                <Text style={styles.qrCodeText}>{item.qrCode}</Text>
              </View>
            )}
            style={styles.qrPreviewContainer}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No QR codes to display</Text>}
          />
          
          <View style={styles.modalButtonRow}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
        
            <TouchableOpacity 
              style={[styles.modalButton, styles.printButton]}
              disabled={qrCodesToPrint.length === 0}
              onPress={async () => {
                if (onPrint) {
                  await onPrint();
                }
                onClose();
              }}
            >
              <Text style={styles.modalButtonText}>Print ({qrCodesToPrint.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default QRPrintModal; 