import { safeStorage } from 'electron';
import type { Cifrador } from './almacenTokensDrive';

// Usa el cifrado del sistema operativo (DPAPI en Windows).
export const cifradorElectron: Cifrador = {
  disponible: () => safeStorage.isEncryptionAvailable(),
  cifrar: (texto) => safeStorage.encryptString(texto),
  descifrar: (datos) => safeStorage.decryptString(datos),
};