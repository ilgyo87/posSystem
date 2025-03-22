import React from 'react';
import { Modal, View } from 'react-native';
import { QRScanner } from '../../QRScanner';
import styles from '../Common/OrderDetailsStyles';
import { QRScannerModalProps } from '../Common/types';

const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onScan, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <QRScanner
            onScan={(qrCode) => {
              onScan(qrCode);
            }}
            onClose={onClose}
          />
        </View>
      </View>
    </Modal>
  );
};

export default QRScannerModal; 