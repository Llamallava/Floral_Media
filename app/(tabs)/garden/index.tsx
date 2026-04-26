import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/db/supabaseClient';

type GalleryEntry = {
  id: string;
  photo_path: string;
  detected_color: string | null;
  captured_at: string;
  flowers: { common_name: string }[] | null;
};

function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from('garden-photos').getPublicUrl(path);
  return data.publicUrl;
}

export default function GardenScreen() {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const router = useRouter();

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const { data } = await supabase
      .from('garden_entries')
      .select('id, photo_path, detected_color, captured_at, flowers(common_name)')
      .eq('user_id', currentUser.id)
      .order('captured_at', { ascending: false });
    setEntries((data as GalleryEntry[]) ?? []);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  function renderItem({ item }: { item: GalleryEntry }) {
    return (
      <TouchableOpacity
        style={{ flex: 1, margin: 4, aspectRatio: 1 }}
        onPress={() => router.push(`/(tabs)/garden/${item.id}`)}
      >
        <Image
          source={{ uri: getPhotoUrl(item.photo_path) }}
          style={{ flex: 1 }}
          resizeMode="cover"
        />
        <View className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
          <Text className="text-white text-xs" numberOfLines={1}>
            {item.flowers?.[0]?.common_name ?? 'Unknown'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-12 pb-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">Garden</Text>
        <TouchableOpacity
          className="bg-green-700 px-4 py-2 rounded-xl"
          onPress={() => router.push('/(tabs)/garden/camera')}
        >
          <Text className="text-white font-medium">+ Photo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center pt-20 px-6">
              <Text className="text-gray-400 text-center">
                No flowers yet.{'\n'}Tap + Photo to add your first.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
