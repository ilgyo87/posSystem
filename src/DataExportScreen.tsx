import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  Alert,
  Clipboard
} from 'react-native';
import { generateClient } from 'aws-amplify/api';
import * as FileSystem from 'expo-file-system';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { Schema } from '../amplify/data/resource';

type DataExportScreenProps = NativeStackScreenProps<RootStackParamList, 'DataExport'>;

const client = generateClient<Schema>();

const DataExportScreen: React.FC<DataExportScreenProps> = ({ route, navigation }) => {
  const { businessId } = route.params || {};
  const [loading, setLoading] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [exportedData, setExportedData] = useState<any>(null);
  const [exportedFileName, setExportedFileName] = useState<string>('');

  const exportData = async (dataType: string) => {
    setLoading(true);
    setExportProgress(`Exporting ${dataType} data...`);
    
    try {
      let data: any;
      
      switch (dataType) {
        case 'business':
          // Export business data
          if (!businessId) {
            throw new Error('Business ID is required');
          }
          
          const businessResponse = await client.models.Business.get({
            id: businessId
          });
          
          if (!businessResponse.data) {
            throw new Error('Business data not found');
          }
          
          data = businessResponse.data;
          break;
          
        case 'customers':
          // Export all customers for this business
          const customersResponse = await client.models.Customer.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          if (!customersResponse.data) {
            throw new Error('Customer data not found');
          }
          
          data = customersResponse.data.map((customer: any) => customer);
          break;
          
        case 'transactions':
          // Export all transactions for this business
          const transactionsResponse = await client.models.Transaction.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          if (!transactionsResponse.data) {
            throw new Error('Transaction data not found');
          }
          
          // For each transaction, get its items
          const transactions = await Promise.all(
            transactionsResponse.data.map(async (transaction: any) => {
              const itemsResponse = await client.models.TransactionItem.list({
                filter: {
                  transactionID: {
                    eq: transaction.id
                  }
                }
              });
              
              return {
                ...transaction,
                items: itemsResponse.data || []
              };
            })
          );
          
          data = transactions;
          break;
          
        case 'orders':
          // Export all orders for this business
          const ordersResponse = await client.models.Order.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          if (!ordersResponse.data) {
            throw new Error('Order data not found');
          }
          
          // For each order, get its items
          const orders = await Promise.all(
            ordersResponse.data.map(async (order: any) => {
              const itemsResponse = await client.models.OrderItem.list({
                filter: {
                  orderID: {
                    eq: order.id
                  }
                }
              });
              
              return {
                ...order,
                items: itemsResponse.data || []
              };
            })
          );
          
          data = orders;
          break;
          
        case 'products':
          // Export all products for this business
          const productsResponse = await client.models.Product.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          if (!productsResponse.data) {
            throw new Error('Product data not found');
          }
          
          data = productsResponse.data.map((product: any) => product);
          break;
          
        case 'services':
          // Export all services for this business
          const servicesResponse = await client.models.Service.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          if (!servicesResponse.data) {
            throw new Error('Service data not found');
          }
          
          data = servicesResponse.data.map((service: any) => service);
          break;
          
        case 'all':
          // Export all data for this business
          if (!businessId) {
            throw new Error('Business ID is required');
          }
          
          setExportProgress('Exporting business data...');
          const businessData = await client.models.Business.get({
            id: businessId
          });
          
          setExportProgress('Exporting customers data...');
          const customersData = await client.models.Customer.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          setExportProgress('Exporting transactions data...');
          const transactionsData = await client.models.Transaction.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          setExportProgress('Exporting transaction items data...');
          const transactionsWithItems = await Promise.all(
            (transactionsData.data || []).map(async (transaction: any) => {
              const itemsResponse = await client.models.TransactionItem.list({
                filter: {
                  transactionID: {
                    eq: transaction.id
                  }
                }
              });
              
              return {
                ...transaction,
                items: itemsResponse.data || []
              };
            })
          );
          
          setExportProgress('Exporting orders data...');
          const ordersData = await client.models.Order.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          setExportProgress('Exporting order items data...');
          const ordersWithItems = await Promise.all(
            (ordersData.data || []).map(async (order: any) => {
              const itemsResponse = await client.models.OrderItem.list({
                filter: {
                  orderID: {
                    eq: order.id
                  }
                }
              });
              
              return {
                ...order,
                items: itemsResponse.data || []
              };
            })
          );
          
          setExportProgress('Exporting products data...');
          const productsData = await client.models.Product.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          setExportProgress('Exporting services data...');
          const servicesData = await client.models.Service.list({
            filter: {
              businessID: {
                eq: businessId
              }
            }
          });
          
          data = {
            business: businessData.data,
            customers: customersData.data || [],
            transactions: transactionsWithItems,
            orders: ordersWithItems,
            products: productsData.data || [],
            services: servicesData.data || []
          };
          break;
          
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }
      
      // Convert data to JSON string
      const jsonData = JSON.stringify(data, null, 2);
      
      // Generate a filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `posSystem_${dataType}_export_${timestamp}.json`;
      setExportedFileName(fileName);
      
      // Save the file
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, jsonData);
      
      setExportedData(data);
      setExportProgress(`Export complete! File saved as ${fileName}`);
      
      // Copy a small preview to clipboard if data is not too large
      const previewData = JSON.stringify(data, null, 2).substring(0, 1000) + '... (truncated)';
      Clipboard.setString(previewData);
      
      Alert.alert(
        'Export Complete',
        `Data exported successfully and saved to ${fileName}. A preview has been copied to your clipboard.`
      );
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Error', error.message || 'An error occurred during export');
      setExportProgress('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const copyDataToClipboard = () => {
    if (!exportedData || !exportedFileName) {
      Alert.alert('No Data', 'Please export data first');
      return;
    }
    
    try {
      // Convert data to JSON string and copy to clipboard
      const jsonData = JSON.stringify(exportedData, null, 2);
      Clipboard.setString(jsonData);
      
      Alert.alert(
        'Data Copied',
        'The exported data has been copied to your clipboard. You can now paste it into another application.'
      );
    } catch (error: any) {
      console.error('Copy error:', error);
      Alert.alert('Copy Error', error.message || 'An error occurred while copying the data');
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Export</Text>
        <Text style={styles.subtitle}>
          Export your business data to use with other applications
        </Text>
      </View>
      
      <View style={styles.exportOptions}>
        <Text style={styles.sectionTitle}>Select data to export:</Text>
        
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={() => exportData('business')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Export Business Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={() => exportData('customers')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Export Customers</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={() => exportData('transactions')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Export Transactions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={() => exportData('orders')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Export Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={() => exportData('products')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Export Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={() => exportData('services')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Export Services</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.exportButton, styles.exportAllButton]} 
          onPress={() => exportData('all')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Export All Data</Text>
        </TouchableOpacity>
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>{exportProgress}</Text>
        </View>
      )}
      
      {exportedData && !loading && (
        <View style={styles.resultContainer}>
          <Text style={styles.successText}>Export Successful!</Text>
          <Text style={styles.fileNameText}>{exportedFileName}</Text>
          
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={copyDataToClipboard}
          >
            <Text style={styles.buttonText}>Copy Data to Clipboard</Text>
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            The exported data is in JSON format and can be imported into other applications.
            You can also use this data for backup purposes.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  exportOptions: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginTop: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212529',
  },
  exportButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  exportAllButton: {
    backgroundColor: '#28a745',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginTop: 16,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  resultContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginTop: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 12,
  },
  fileNameText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
  },
  shareButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DataExportScreen;
