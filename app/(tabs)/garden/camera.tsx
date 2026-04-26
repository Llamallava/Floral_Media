import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../../../src/db/supabaseClient';
import { identifyPlant } from '../../../src/services/PlantIdService';
import { generateFlowerLore } from '../../../src/services/ClaudeService';
import { flowerRepository } from '../../../src/repositories/SupabaseFlowerRepository';
import { gardenRepository } from '../../../src/repositories/SupabaseGardenRepository';
import { useAuth } from '../../../src/context/AuthContext';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { currentUser } = useAuth();

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-medium text-gray-900 mb-2 text-center">
          Camera access needed
        </Text>
        <Text className="text-sm text-gray-500 mb-6 text-center">
          Floral Media needs the camera to identify flowers.
        </Text>
        <TouchableOpacity
          className="bg-green-700 px-6 py-3 rounded-xl"
          onPress={requestPermission}
        >
          <Text className="text-white font-medium">Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function capture() {
    if (!cameraRef.current || processing || !currentUser) return;
    setProcessing(true);

    try {
      setStatus('Capturing...');
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.3 });
      if (!photo?.uri || !photo.base64) throw new Error('Photo capture failed.');

      const entryId = randomUUID();
      const storagePath = `${currentUser.id}/${entryId}.jpg`;

      setStatus('Uploading photo...');
      const bytes = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from('garden-photos')
        .upload(storagePath, bytes, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      setStatus('Identifying flower...');
      const plantId = await identifyPlant(photo.base64);
      const flowerName = plantId.commonNames[0] ?? plantId.speciesName;

      setStatus('Checking Lexicon...');
      const cached = await flowerRepository.getByScientificName(plantId.speciesName);

      let flowerId: string;
      if (cached) {
        flowerId = cached.id;
      } else {
        setStatus('Generating lore...');
        const lore = await generateFlowerLore(flowerName);
        flowerId = lore.flowerId;
      }

      setStatus('Saving...');
      const entry = await gardenRepository.save({
        id: entryId,
        user_id: currentUser.id,
        flower_id: flowerId,
        photo_path: storagePath,
        detected_color: null,
        confidence: plantId.confidence,
        latitude: null,
        longitude: null,
        captured_at: new Date().toISOString(),
      });

      router.replace(`/(tabs)/garden/${entry.id}`);

    } catch (err: any) {
      Alert.alert('Something went wrong', err.message ?? 'Unknown error');
      setProcessing(false);
      setStatus('');
    }
  }

  return (
    <View className="flex-1 bg-black">
<CameraView
  ref={cameraRef}
  style={{ flex: 1, width: '100%' }}
  facing="back"
/>

      {processing ? (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <ActivityIndicator color="white" size="large" />
          <Text className="text-white mt-4 text-base">{status}</Text>
        </View>
      ) : (
        <View className="absolute bottom-12 left-0 right-0 items-center">
          <TouchableOpacity
            onPress={capture}
            className="w-20 h-20 rounded-full bg-white border-4 border-green-700"
          />
        </View>
      )}

      <TouchableOpacity
        className="absolute top-14 left-4"
        onPress={() => router.back()}
      >
        <Text className="text-white text-lg">✕</Text>
      </TouchableOpacity>
    </View>
  );
}
