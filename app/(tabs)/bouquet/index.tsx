import { View, Text, StyleSheet } from 'react-native';

export default function BouquetScreen() {
  return (
    <View style={styles.container}>
      <Text>Bouquet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
