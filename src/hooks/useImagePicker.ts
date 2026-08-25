import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { imageStorage } from '@/services/imageStorage';
import { toUserMessage } from '@/utils/errors';

/**
 * Selección de una imagen desde la galería.
 *
 * Devuelve la CLAVE de almacenamiento, no la URI temporal del selector: la
 * imagen se copia al directorio de la app en el momento de elegirla, porque
 * el archivo que entrega el selector vive en la caché del sistema y puede
 * desaparecer.
 */
export function useImagePicker(): {
  pickImage: () => Promise<string | null>;
  isPicking: boolean;
  error: string | null;
} {
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = useCallback(async (): Promise<string | null> => {
    setIsPicking(true);
    setError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Necesitamos permiso para acceder a tus fotos.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });

      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return null;

      return await imageStorage.persist(asset.uri);
    } catch (cause) {
      setError(toUserMessage(cause, 'No se pudo usar esa imagen.'));
      return null;
    } finally {
      setIsPicking(false);
    }
  }, []);

  return { pickImage, isPicking, error };
}
