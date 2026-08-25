import { Directory, File, Paths } from 'expo-file-system';

import { createId } from '@/utils/id';

/**
 * Almacenamiento de imágenes de actividades.
 *
 * La interfaz existe para que la implementación se pueda cambiar sin tocar la
 * UI: hoy copia el archivo al directorio de documentos de la app, mañana puede
 * subirlo a Firebase Storage y devolver la ruta del bucket. Las pantallas solo
 * conocen `persist`, `resolve` y `remove`.
 */
export interface ImageStorage {
  /** Copia una imagen elegida por el usuario y devuelve su clave de almacenamiento. */
  persist(sourceUri: string): Promise<string>;
  /** Convierte una clave en algo que `<Image source={{ uri }}>` pueda mostrar. */
  resolve(key: string | null): string | null;
  /** Borra la imagen si le pertenece a la app. */
  remove(key: string | null): Promise<void>;
}

/** Subcarpeta dentro del directorio de documentos. Forma parte de la clave. */
const IMAGES_FOLDER = 'activity-images';

function imagesDirectory(): Directory {
  return new Directory(Paths.document, IMAGES_FOLDER);
}

function ensureImagesDirectory(): Directory {
  const directory = imagesDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

export const localImageStorage: ImageStorage = {
  async persist(sourceUri: string): Promise<string> {
    const directory = ensureImagesDirectory();
    const source = new File(sourceUri);

    // `extension` llega con punto ('.jpg'). El selector de iOS puede devolver
    // HEIC o incluso una URI sin extensión, de ahí el valor por defecto.
    const extension = source.extension || '.jpg';
    const fileName = `${createId()}${extension}`;

    await source.copy(new File(directory, fileName));

    return `${IMAGES_FOLDER}/${fileName}`;
  },

  resolve(key: string | null): string | null {
    if (!key) return null;
    // Una clave ya absoluta (por ejemplo una URL remota en el futuro) se
    // devuelve tal cual.
    if (key.startsWith('file://') || key.startsWith('http')) return key;
    return new File(Paths.document, key).uri;
  },

  async remove(key: string | null): Promise<void> {
    if (!key || key.startsWith('http')) return;

    try {
      const file = new File(Paths.document, key);
      if (file.exists) file.delete();
    } catch (error) {
      // Que no se pueda borrar un archivo huérfano no debe impedir guardar
      // la actividad: se registra y se sigue.
      console.warn('[Launchpad] No se pudo borrar la imagen:', key, error);
    }
  },
};

/** Implementación activa. Único punto a cambiar cuando entre el almacenamiento remoto. */
export const imageStorage: ImageStorage = localImageStorage;
