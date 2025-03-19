import { StyleSheet } from 'react-native';

export const orderDetailsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  barcodeSection: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  barcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    justifyContent: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  summarySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  customerName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  garmentCount: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 4,
    marginHorizontal: 2,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '49%',
  },
  itemControls: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  scannedItem: {
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scannedItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageActions: {
    marginLeft: 8,
    alignItems: 'center',
  },
  garmentImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginBottom: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
  },
  uploadButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    marginHorizontal: 8,
  },
}); 