import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bucket, Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface SignedUploadTarget {
  uploadUrl: string;
  publicUrl: string;
  objectPath: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

/**
 * Google Cloud Storage access.
 *
 * Uploads never pass through Cloud Run: the API mints a short-lived V4 signed
 * PUT URL and the browser writes straight to the bucket. On Cloud Run the
 * service account's Application Default Credentials sign the URL, which needs
 * the `iam.serviceAccounts.signBlob` permission (roles/iam.serviceAccountTokenCreator).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly storage: Storage;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucketName = this.config.get<string>('storage.bucket', '');
    this.publicBaseUrl = this.config.get<string>('storage.publicBaseUrl', '');
    this.storage = new Storage({ projectId: this.config.get<string>('storage.projectId') });
  }

  onModuleInit(): void {
    if (!this.bucketName) {
      this.logger.warn('GCS_BUCKET is not set — media uploads are disabled.');
    }
  }

  private get bucket(): Bucket {
    if (!this.bucketName) {
      throw new BadRequestException('Object storage is not configured on this environment.');
    }
    return this.storage.bucket(this.bucketName);
  }

  /** Build a collision-proof object path grouped by folder, e.g. `products/2026/ab12.webp`. */
  private buildObjectPath(folder: string, filename: string): string {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'misc';
    const extension = (filename.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${safeFolder}/${randomUUID()}.${extension}`;
  }

  publicUrlFor(objectPath: string): string {
    const base = this.publicBaseUrl || `https://storage.googleapis.com/${this.bucketName}`;
    return `${base.replace(/\/$/, '')}/${objectPath}`;
  }

  async createSignedUpload(params: {
    folder: string;
    filename: string;
    contentType: string;
    contentLength?: number;
  }): Promise<SignedUploadTarget> {
    if (!ALLOWED_MIME.has(params.contentType)) {
      throw new BadRequestException(`Unsupported content type: ${params.contentType}`);
    }
    if (params.contentLength && params.contentLength > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(`File exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`);
    }

    const objectPath = this.buildObjectPath(params.folder, params.filename);
    const expires = Date.now() + 10 * 60 * 1000;

    const [uploadUrl] = await this.bucket.file(objectPath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires,
      contentType: params.contentType,
    });

    return {
      uploadUrl,
      publicUrl: this.publicUrlFor(objectPath),
      objectPath,
      expiresAt: new Date(expires).toISOString(),
      requiredHeaders: { 'Content-Type': params.contentType },
    };
  }

  /** Signed read URL, for private buckets where objects are not world-readable. */
  async createSignedRead(objectPath: string, ttlSeconds = 3600): Promise<string> {
    const [url] = await this.bucket.file(objectPath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + ttlSeconds * 1000,
    });
    return url;
  }

  async delete(objectPath: string): Promise<void> {
    try {
      await this.bucket.file(objectPath).delete({ ignoreNotFound: true });
    } catch (error) {
      this.logger.warn(`Failed to delete ${objectPath}: ${(error as Error).message}`);
    }
  }
}
