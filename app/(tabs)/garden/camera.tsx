import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { supabase } from '../../../src/db/supabaseClient';
import { identifyPlant } from '../../../src/services/PlantIdService';
import { detectColor, generateFlowerLore } from '../../../src/services/ClaudeService';
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
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      if (!photo?.uri || !photo.base64) throw new Error('Photo capture failed.');

      const entryId = randomUUID();
      const storagePath = `${currentUser.id}/${entryId}.jpg`;

      // Upload photo to Supabase Storage
      setStatus('Uploading photo...');
      const fileRes = await fetch(photo.uri);
      const blob = await fileRes.blob();
      const { error: uploadError } = await supabase.storage
        .from('garden-photos')
        .upload(storagePath, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      // Identify species via Plant.id Edge Function
      setStatus('Identifying flower...');
      const plantId = await identifyPlant(photo.base64);

      // Check Lexicon for existing entry
      setStatus('Checking Lexicon...');
      const matches = await flowerRepository.search(plantId.speciesName);
      const cached = matches.find(
        f => f.sci_name?.toLowerCase() === plantId.speciesName.toLowerCase()
      );

      let flowerId: string;
      let detectedColor: string;

      if (cached) {
        // Cache hit — color only
        setStatus('Detecting color...');
        detectedColor = await detectColor(photo.base64);
        flowerId = cached.id;
      } else {
        // Cache miss — full lore + DB write happens inside Edge Function
        setStatus('Generating lore...');
        const lore = await generateFlowerLore(photo.base64, plantId);
        flowerId = lore.flowerId;
        detectedColor = lore.detectedColor;
      }

      // Save garden entry
      setStatus('Saving...');
      const entry = await gardenRepository.save({
        id: entryId,
        user_id: currentUser.id,
        flower_id: flowerId,
        photo_path: storagePath,
        detected_color: detectedColor,
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
      <CameraView ref={cameraRef} className="flex-1" facing="back" />

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
