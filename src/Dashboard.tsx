import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../src/types';

type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function Dashboard({ route }: DashboardScreenProps) {
  const { businessId, businessName } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const menuItems = [
    { title: 'Service Management', screen: 'ServiceManagement', icon: '🧹' },
    { title: 'Product Management', screen: 'ProductManagement', icon: '📦' },
    { title: 'Employee Management', screen: 'EmployeeManagement', icon: '👥' },
    { title: 'Appointments', screen: 'Appointments', icon: '📅' },
    { title: 'Orders', screen: 'Orders', icon: '📝' },
    { title: 'Customers', screen: 'Customers', icon: '👤' },
    { title: 'Reports', screen: 'Reports', icon: '📊' },
    { title: 'Settings', screen: 'Settings', icon: '⚙️' },
  ];

  const navigateToScreen = (screenName: keyof RootStackParamList) => {
    // Type-safe navigation based on the screen
    switch (screenName) {
      case 'ServiceManagement':
      case 'ProductManagement':
      case 'EmployeeManagement':
      case 'Appointments':
      case 'Orders':
      case 'Customers':
      case 'Reports':
      case 'Settings':
        navigation.navigate(screenName, { businessId });
        break;
      case 'Dashboard':
        navigation.navigate(screenName, { businessId, businessName });
        break;
      case 'CustomerSelection':
        navigation.navigate(screenName, { businessId, businessName });
        break;
      case 'BusinessCreate':
        navigation.navigate(screenName);
        break;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.businessName}>{businessName || 'My Business'}</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
      </View>

      {/* Start Transaction Button */}
      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => navigateToScreen('CustomerSelection')}
      >
        <Text style={styles.startButtonText}>Start Transaction</Text>
      </TouchableOpacity>

      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigateToScreen(item.screen as keyof RootStackParamList)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    marginBottom: 15,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});
