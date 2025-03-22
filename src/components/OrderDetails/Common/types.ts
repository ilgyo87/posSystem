import { NavigationProp } from '@react-navigation/native';
import { Schema } from '../../../../amplify/data/resource';
import { RootStackParamList } from '../../../types';
import { TextInput } from 'react-native';
import { GarmentData, OrderData, TransactionItemData } from '../../../types';

// TemporaryGarment is used for editing garments
export type TemporaryGarment = {
  qrCode: string;
  description: string;
  status: string;
  transactionItemID: string;
};

// Props for the OrderDetails component
export interface OrderDetailsProps {
  route: {
    params: {
      orderId: string;
      businessId: string;
    };
  };
  navigation: NavigationProp<RootStackParamList>;
}

// Props for the OrderDetailsPending component
export interface OrderDetailsPendingProps {
  order: OrderData;
  orderItems: TransactionItemData[];
  garments: GarmentData[];
  scannedCount: number;
  totalGarments: number;
  serviceCategories: Record<string, TransactionItemData[]>;
  setShowQRScanner?: React.Dispatch<React.SetStateAction<boolean>>;
  handleBarcodeSubmit: (barcode: string) => Promise<void>;
  handleCompleteOrder?: () => Promise<void>;
  handleEditGarment?: (garment: GarmentData) => void;
  handleDeleteGarment?: (garment: GarmentData) => void;
  handleAdjustQuantity: (item: TransactionItemData, newQuantity: number, adjustmentNote: string) => Promise<void>;
  setShowPrintModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedItem: React.Dispatch<React.SetStateAction<TransactionItemData | null>>;
  setQrCodesToPrint: React.Dispatch<React.SetStateAction<string[]>>;
  qrQuantities: Record<string, string>;
  setQrQuantities: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  adjustQuantities: Record<string, string>;
  setAdjustQuantities: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  barcodeInput: string;
  setBarcodeInput: React.Dispatch<React.SetStateAction<string>>;
  barcodeInputRef: React.RefObject<TextInput>;
  showScanModal?: boolean;
  setShowScanModal: React.Dispatch<React.SetStateAction<boolean>>;
  navigation: NavigationProp<RootStackParamList, "OrderDetails">;
  businessId: string;
}

// Props for the OrderDetailsProcessing component
export interface OrderDetailsProcessingProps {
  order: Schema['Transaction']['type'];
  garments: Schema['Garment']['type'][];
  completedGarments: string[];
  barcodeInput: string;
  setBarcodeInput: React.Dispatch<React.SetStateAction<string>>;
  barcodeInputRef: React.RefObject<TextInput>;
  handleBarcodeSubmit: () => Promise<void>;
  navigation: NavigationProp<RootStackParamList>;
  businessId: string;
}

// Props for the ScannedItemList component
export interface ScannedItemListProps {
  garments: GarmentData[];
  onEditGarment?: (garment: GarmentData) => void;
  onDeleteGarment?: (garment: GarmentData) => void;
  enableEditing?: boolean;
}

// Props for the ServiceItem component
export interface ServiceItemProps {
  serviceName: string;
  serviceItems: TransactionItemData[];
  totalQuantity: number;
  qrQuantities: Record<string, string>;
  setQrQuantities: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  adjustQuantities: Record<string, string>;
  setAdjustQuantities: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSelectedItem: React.Dispatch<React.SetStateAction<TransactionItemData | null>>;
  setQrCodesToPrint: React.Dispatch<React.SetStateAction<string[]>>;
  setShowPrintModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleAdjustQuantity: (item: TransactionItemData, newQuantity: number, adjustmentNote: string) => Promise<void>;
  garments: GarmentData[];
}

// Props for the QRScannerModal component
export interface QRScannerModalProps {
  visible: boolean;
  onScan: (qrCode: string) => void;
  onClose: () => void;
}

// Props for the QRPrintModal component
export interface QRPrintModalProps {
  visible: boolean;
  qrCodesToPrint: { qrCode: string; description: string }[];
  onClose: () => void;
  onPrint?: () => void;
}

// Props for the EditGarmentModal component
export interface EditGarmentModalProps {
  visible: boolean;
  garment: GarmentData | null;
  onSave: (updatedGarment: GarmentData) => void;
  onClose: () => void;
} 