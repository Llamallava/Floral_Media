import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/db/supabaseClient';
import { gardenRepository } from '../../../src/repositories/SupabaseGardenRepository';
import { flowerRepository } from '../../../src/repositories/SupabaseFlowerRepository';
import type { GardenEntry } from '../../../src/repositories/GardenRepository';
import type { Flower } from '../../../src/repositories/FlowerRepository';

const TABS = ['Summary', 'Mythology', 'History', 'Colors'] as const;
type Tab = typeof TABS[number];

function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from('garden-photos').getPublicUrl(path);
  return data.publicUrl;
}

export default function GardenEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<GardenEntry | null>(null);
  const [flower, setFlower] = useState<Flower | null>(null);
  const [genericFlower, setGenericFlower] = useState<Flower | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');

  useEffect(() => {
    if (!id) return;
    gardenRepository.getById(id).then(async e => {
      setEntry(e);
      if (e?.flower_id) {
        const f = await flowerRepository.getById(e.flower_id);
        setFlower(f);
        if (f?.sci_name) {
          const genus = f.sci_name.split(' ')[0];
          if (genus !== f.sci_name) {
            const generic = await flowerRepository.getByScientificName(genus);
            setGenericFlower(generic);
          }
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
  }

  if (!entry || !flower) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">Entry not found.</Text>
      </View>
    );
  }

  const colorMeanings: Record<string, string> = flower.color_meanings
    ? JSON.parse(flower.color_meanings)
    : {};
  const specificMeaning = entry.detected_color ? colorMeanings[entry.detected_color] : null;

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
            {specificMeaning && (
              <View className="bg-green-50 rounded-xl p-4 mb-2">
                <Text className="text-xs font-semibold text-green-700 uppercase mb-1">
                  This flower — {entry?.detected_color}
                </Text>
                <Text className="text-base text-gray-700 leading-relaxed">{specificMeaning}</Text>
              </View>
            )}
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
      <View className="relative">
        <Image
          source={{ uri: getPhotoUrl(entry.photo_path) }}
          style={{ width: '100%', height: 260 }}
          resizeMode="cover"
        />
        <TouchableOpacity
          className="absolute top-14 left-4 bg-black/40 rounded-full px-3 py-1"
          onPress={() => router.back()}
        >
          <Text className="text-white text-sm">← Back</Text>
        </TouchableOpacity>
        {entry.detected_color && (
          <View className="absolute bottom-3 right-3 bg-black/50 rounded-full px-3 py-1">
            <Text className="text-white text-xs capitalize">{entry.detected_color}</Text>
          </View>
        )}
      </View>

      <View className="px-4 py-4 border-b border-gray-100">
        <Text className="text-3xl font-bold text-gray-900">{flower.common_name}</Text>
        {flower.sci_name && (
          <Text className="text-base italic text-gray-400 mt-1">{flower.sci_name}</Text>
        )}
        {entry.confidence != null && (
          <Text className="text-xs text-gray-400 mt-1">
            Identified with {Math.round(entry.confidence * 100)}% confidence
          </Text>
        )}
      </View>

      {genericFlower && (
        <TouchableOpacity
          className="mx-4 my-3 bg-green-50 rounded-xl p-4"
          onPress={() => router.push(`/(tabs)/lexicon/${genericFlower.id}`)}
        >
          <Text className="text-xs font-semibold text-green-700 uppercase mb-1">
            Part of the {genericFlower.common_name} family
          </Text>
          <Text className="text-sm text-gray-600 leading-relaxed" numberOfLines={2}>
            {genericFlower.summary}
          </Text>
          <Text className="text-xs text-green-700 mt-2">View in Lexicon →</Text>
        </TouchableOpacity>
      )}

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

      <ScrollView className="flex-1 px-4 py-4">
        {renderContent()}
      </ScrollView>
    </View>
  );
}
