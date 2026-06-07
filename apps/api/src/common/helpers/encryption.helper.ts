import * as crypto from 'crypto';

export class EncryptionHelper {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;

  static encrypt(text: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Định dạng: iv:encryptedText:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  static decrypt(encryptedText: string): string {
    try {
      const key = this.getKey();
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Định dạng mã hóa không hợp lệ.');
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      throw new Error(`Giải mã thất bại: ${err.message}`);
    }
  }

  private static getKey(): Buffer {
    const keyStr = process.env.ENCRYPTION_KEY || 'agentx-default-secret-encryption-key-32-chars';
    // Đảm bảo tạo khóa có độ dài chính xác 32 bytes từ keyStr
    return crypto.scryptSync(keyStr, 'agentx-salt', 32);
  }
}
