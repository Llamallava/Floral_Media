import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { flowerRepository } from '../../../src/repositories/SupabaseFlowerRepository';
import type { Flower } from '../../../src/repositories/FlowerRepository';

const TABS = ['Summary', 'Mythology', 'History', 'Colors'] as const;
type Tab = typeof TABS[number];

export default function FlowerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [flower, setFlower] = useState<Flower | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');

  useEffect(() => {
    if (id) flowerRepository.getById(id).then(setFlower).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (!flower) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">Flower not found.</Text>
      </View>
    );
  }

  const colorMeanings: Record<string, string> = flower.color_meanings
    ? JSON.parse(flower.color_meanings)
    : {};

  function renderContent() {
    switch (activeTab) {
      case 'Summary':
        return <Text className="text-base text-gray-700 leading-relaxed">{flower?.summary ?? 'No summary available.'}</Text>;
      case 'Mythology':
        return <Text className="text-base text-gray-700 leading-relaxed">{flower?.mythology ?? 'No mythology recorded.'}</Text>;
      case 'History':
        return <Text className="text-base text-gray-700 leading-relaxed">{flower?.history ?? 'No history recorded.'}</Text>;
      case 'Colors':
        return (
          <View className="gap-4">
            {Object.entries(colorMeanings).map(([color, meaning]) => (
              <View key={color}>
                <Text className="text-sm font-semibold text-gray-500 uppercase mb-1">{color}</Text>
                <Text className="text-base text-gray-700 leading-relaxed">{meaning}</Text>
              </View>
            ))}
            {Object.keys(colorMeanings).length === 0 && (
              <Text className="text-gray-400">No color meanings recorded.</Text>
            )}
          </View>
        );
    }
  }

  return (
    <View className="flex-1 bg-white">
      {/* Image — top third of screen */}
      <View style={{ height: height / 3 }}>
        {flower.image_url ? (
          <Image
            source={{ uri: flower.image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-green-50" />
        )}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-12 left-4 bg-white/80 rounded-full px-3 py-1"
        >
          <Text className="text-green-700 font-medium">← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Flower name */}
      <View className="px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-3xl font-bold text-gray-900">{flower.common_name}</Text>
        {flower.sci_name && (
          <Text className="text-base italic text-gray-400 mt-1">{flower.sci_name}</Text>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-100">
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 items-center ${activeTab === tab ? 'border-b-2 border-green-700' : ''}`}
          >
            <Text className={`text-sm font-medium ${activeTab === tab ? 'text-green-700' : 'text-gray-400'}`}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView className="flex-1 px-4 py-4">
        {renderContent()}
      </ScrollView>
    </View>
  );
}
