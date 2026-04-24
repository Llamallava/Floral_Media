import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="lexicon" options={{ title: 'Lexicon' }} />
      <Tabs.Screen name="garden" options={{ title: 'Garden' }} />
      <Tabs.Screen name="bouquet" options={{ title: 'Bouquet' }} />
    </Tabs>
  );
}
