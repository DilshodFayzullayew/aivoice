import * as SecureStore from 'expo-secure-store';

/**
 * Ilovaga tez kirish uchun PIN-kod — telefonning xavfsiz xotirasida (Keychain / Keystore), har bir foydalanuvchiga alohida.
 * Serverga yuborilmaydi: PIN faqat shu telefonda ilovani qulflaydi, haqiqiy kirish — login va parol.
 */
const key = (userId: number) => `pin_user_${userId}`;

export async function hasPin(userId: number): Promise<boolean> {
  try {
    return !!(await SecureStore.getItemAsync(key(userId)));
  } catch {
    return false;
  }
}

export async function savePin(userId: number, pin: string): Promise<void> {
  await SecureStore.setItemAsync(key(userId), pin);
}

export async function checkPin(userId: number, pin: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(key(userId))) === pin;
  } catch {
    return false;
  }
}

export async function clearPin(userId: number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key(userId));
  } catch {
    // o'chirib bo'lmasa ham keyingi kirishda yangi PIN o'rnatiladi
  }
}
