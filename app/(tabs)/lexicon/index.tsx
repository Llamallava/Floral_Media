import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { flowerRepository } from '../../../src/repositories/SupabaseFlowerRepository';
import type { Flower } from '../../../src/repositories/FlowerRepository';

export default function LexiconScreen() {
  const [query, setQuery] = useState('');
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const fetch = query.length > 0
      ? flowerRepository.search(query)
      : flowerRepository.getAll();
    fetch.then(setFlowers).finally(() => setLoading(false));
  }, [query]);

  function renderItem({ item }: { item: Flower }) {
    return (
      <TouchableOpacity
        className="px-4 py-3 border-b border-gray-100"
        onPress={() => router.push(`/(tabs)/lexicon/${item.id}`)}
      >
        <Text className="text-base font-medium text-gray-900">{item.common_name}</Text>
        {item.sci_name && (
          <Text className="text-sm italic text-gray-400">{item.sci_name}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-12 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Lexicon</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/lexicon/flashcards')}>
            <Text className="text-green-700 font-medium">Flash Cards</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          className="bg-gray-100 rounded-lg px-4 py-2 text-base text-gray-900"
          placeholder="Search flowers..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {loading ? (
        <ActivityIndicator className="mt-12" />
      ) : (
        <FlatList
          data={flowers}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="text-center text-gray-400 mt-12">No flowers found.</Text>
          }
        />
      )}
    </View>
  );
}
