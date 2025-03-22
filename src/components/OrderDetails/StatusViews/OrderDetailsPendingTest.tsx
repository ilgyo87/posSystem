import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import styles from '../Common/OrderDetailsStyles';
import { OrderDetailsPendingProps } from '../Common/types';
import ServiceItem from '../Common/ServiceItem';
import ScannedItemList from '../Common/ScannedItemList';

const OrderDetailsPendingTest: React.FC<OrderDetailsPendingProps> = (props) => (
  <ScrollView style={styles.container}>
    <View>
      <Text>This is a test component</Text>
    </View>
  </ScrollView>
);

export default OrderDetailsPendingTest; 