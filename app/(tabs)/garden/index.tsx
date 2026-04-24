import { View, Text, StyleSheet } from 'react-native';

export default function LexiconScreen() {
  return (
    <View style={styles.container}>
      <Text>Garden</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
