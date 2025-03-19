import React from 'react';
import { Modal as RNModal, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Button } from './Button';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  style,
  showCloseButton = true,
}) => {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.content, style]}>
          <Text style={styles.title}>{title}</Text>
          {children}
          {showCloseButton && (
            <View style={styles.buttonContainer}>
              <Button
                title="Close"
                onPress={onClose}
                variant="secondary"
              />
            </View>
          )}
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 16,
  },
}); 