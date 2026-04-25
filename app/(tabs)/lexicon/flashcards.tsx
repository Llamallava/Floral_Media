import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { flowerRepository } from '../../../src/repositories/SqliteFlowerRepository';
import type { Flower } from '../../../src/repositories/FlowerRepository';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function FlashcardsScreen() {
  const [deck] = useState<Flower[]>(() => shuffle(flowerRepository.getAll()));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const flower = deck[index];
  const total = deck.length;

  function next() {
    setRevealed(false);
    setIndex(i => (i + 1) % total);
  }

  function previous() {
    setRevealed(false);
    setIndex(i => (i - 1 + total) % total);
  }

  if (!flower) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">No flowers in the Lexicon yet.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-12 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Flash Cards</Text>
        <Text className="text-sm text-gray-400 mt-1">{index + 1} of {total}</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        <View className="bg-green-50 rounded-2xl p-6 mb-6">
          <Text className="text-sm font-semibold text-green-700 uppercase mb-3">What flower is this?</Text>
          <Text className="text-base text-gray-700 leading-relaxed">{flower.summary}</Text>
        </View>

        {!revealed ? (
          <TouchableOpacity
            className="bg-green-700 rounded-xl py-4 items-center mb-4"
            onPress={() => setRevealed(true)}
          >
            <Text className="text-white font-semibold text-base">Reveal</Text>
          </TouchableOpacity>
        ) : (
          <View className="mb-4">
            <View className="border border-green-200 rounded-2xl p-6 mb-4">
              <Text className="text-3xl font-bold text-gray-900">{flower.common_name}</Text>
              {flower.sci_name && (
                <Text className="text-base italic text-gray-400 mt-1">{flower.sci_name}</Text>
              )}
              {flower.mythology && (
                <>
                  <Text className="text-sm font-semibold text-gray-500 uppercase mt-4 mb-2">Mythology</Text>
                  <Text className="text-sm text-gray-600 leading-relaxed">{flower.mythology}</Text>
                </>
              )}
              {flower.history && (
                <>
                  <Text className="text-sm font-semibold text-gray-500 uppercase mt-4 mb-2">History</Text>
                  <Text className="text-sm text-gray-600 leading-relaxed">{flower.history}</Text>
                </>
              )}
            </View>
          </View>
        )}

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 border border-gray-200 rounded-xl py-4 items-center"
            onPress={previous}
          >
            <Text className="text-gray-600 font-medium">← Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border border-gray-200 rounded-xl py-4 items-center"
            onPress={next}
          >
            <Text className="text-gray-600 font-medium">Next →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
