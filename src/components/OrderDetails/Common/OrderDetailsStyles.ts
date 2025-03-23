import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  orderInfoContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  pendingStatus: {
    backgroundColor: '#ffd700',
  },
  processingStatus: {
    backgroundColor: '#add8e6',
  },
  cleanedStatus: {
    backgroundColor: '#90ee90',
  },
  readyStatus: {
    backgroundColor: '#87cefa',
  },
  completedStatus: {
    backgroundColor: '#98fb98',
  },
  cancelledStatus: {
    backgroundColor: '#ffcccb',
  },
  statusText: {
    fontWeight: 'bold',
  },
  orderInfo: {
    marginBottom: 16,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 100,
  },
  infoValue: {
    flex: 1,
  },
  rackLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  notesSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  noteLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  emptyNote: {
    fontStyle: 'italic',
    color: '#aaa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    flex: 1,
    minWidth: 120,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  serviceQuantityContainer: {
    alignItems: 'flex-end',
  },
  serviceQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  productCount: {
    fontSize: 12,
    color: '#666',
  },
  serviceControls: {
    marginTop: 8,
  },
  serviceControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  controlGroup: {
    marginBottom: 12,
    flex: 1,
    paddingRight: 8,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  controlPreview: {
    fontWeight: 'normal',
    color: '#666',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
  },
  counterButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterValue: {
    marginHorizontal: 12,
    fontSize: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  existingCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  barcodeSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  barcodeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  scanRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressContainer: {
    flex: 1,
    marginRight: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4682b4',
  },
  scanButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: '#5cb85c',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scannedItemsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    flex: 1,
  },
  scannedItemsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  scannedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scannedItemInfo: {
    flex: 1,
  },
  scannedItemCode: {
    fontWeight: 'bold',
  },
  scannedItemDescription: {
    color: '#666',
    fontSize: 14,
  },
  scannedItemActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#ffeeee',
    borderRadius: 4,
  },
  emptyListMessage: {
    padding: 16,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#999',
    fontStyle: 'italic',
  },
  editDescriptionButton: {
    backgroundColor: '#4682b4',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editDescriptionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
    maxWidth: 500,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
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
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    margin: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4caf50',
  },
  printButton: {
    backgroundColor: '#2196f3',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  printModalContent: {
    maxWidth: 600,
  },
  qrPreviewContainer: {
    maxHeight: 400,
  },
  qrPreviewItem: {
    alignItems: 'center',
    margin: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  qrCodeWrapper: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  qrDescription: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  qrCodeText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default styles; 