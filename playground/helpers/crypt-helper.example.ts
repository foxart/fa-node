import { CryptClass } from '../../src';

export function run(): void {
  const crypt = new CryptClass('kms', 'hmac');
  // Шифруем поле
  const sensitiveData = 'паспортные данные';
  const encryptedField = crypt.encrypt(sensitiveData);
  console.log('Encrypted:', encryptedField);
  console.log('Encrypted:', crypt.encrypt(sensitiveData));
  // Дешифруем поле
  const decrypted = crypt.decrypt(encryptedField);
  console.log('Decrypted:', decrypted);
}
