import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

@Injectable()
export class R2Service {
  private s3Client?: S3Client;
  private logger = new Logger(R2Service.name);

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region: 'auto',
      });
      this.logger.log('Cloudflare R2 depolama istemcisi başarıyla başlatıldı.');
    } else {
      this.logger.warn('Cloudflare R2 anahtarları (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) eksik. Görseller yedek (inline WebP) modunda saklanacak.');
    }
  }

  /**
   * Optimizes an image with sharp (scales down to 1600px width max, converts to webp)
   * and uploads to Cloudflare R2 bucket with fallback if R2 credentials are missing or fail.
   */
  async uploadImage(
    fileBuffer: Buffer,
    folderPath: string,
  ): Promise<{ url: string; storageKey: string; fileSize: number; mimeType: string }> {
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

    // Optimize image
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(fileBuffer)
        .resize(1600, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (e) {
      optimizedBuffer = fileBuffer;
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const storageKey = `${folderPath}/${uniqueId}.webp`;

    if (this.s3Client && bucketName && publicUrl) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: storageKey,
            Body: optimizedBuffer,
            ContentType: 'image/webp',
          }),
        );

        const url = `${publicUrl}/${storageKey}`;
        return {
          url,
          storageKey,
          fileSize: optimizedBuffer.length,
          mimeType: 'image/webp',
        };
      } catch (err) {
        this.logger.warn('Cloudflare R2 upload failed, falling back to Data URL:', err);
      }
    } else {
      this.logger.warn('Cloudflare R2 environment variables missing, using fallback Data URL.');
    }

    // Fallback: Return Data URL for local/testing environments without R2 config
    const base64Data = optimizedBuffer.toString('base64');
    const fallbackUrl = `data:image/webp;base64,${base64Data}`;

    return {
      url: fallbackUrl,
      storageKey,
      fileSize: optimizedBuffer.length,
      mimeType: 'image/webp',
    };
  }

  /**
   * Downloads a stream from Cloudflare R2.
   */
  async downloadStream(storageKey: string) {
    if (!this.s3Client) return null;
    const bucketName = process.env.R2_BUCKET_NAME;
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
      }),
    );
    return response.Body;
  }

  /**
   * Deletes an image from Cloudflare R2 bucket.
   */
  async deleteImage(storageKey: string): Promise<void> {
    if (!this.s3Client) return;
    const bucketName = process.env.R2_BUCKET_NAME;
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
        }),
      );
    } catch (err) {
      this.logger.error(`Error deleting image ${storageKey} from R2:`, err);
    }
  }
}
