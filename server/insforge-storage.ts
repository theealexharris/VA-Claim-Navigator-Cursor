import { insforge } from './insforge';
import { Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Insforge Storage Service
 * Replaces Replit object storage with Insforge storage SDK
 */
export class InsforgeStorageService {
  private bucketName: string;

  constructor(bucketName: string = 'uploads') {
    this.bucketName = bucketName;
  }

  /**
   * Get a presigned upload URL for file uploads
   * Note: Insforge doesn't use presigned URLs - files are uploaded directly
   * This method returns the bucket reference for client-side uploads
   */
  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    // For Insforge, we return a placeholder URL
    // The actual upload happens client-side using the SDK
    const objectId = randomUUID();
    return {
      uploadURL: `/api/storage/upload/${objectId}`, // This will be handled by our API endpoint
      objectPath: `/objects/${objectId}`,
    };
  }

  /**
   * Upload a file to Insforge storage
   */
  async uploadFile(file: File | Blob, path: string): Promise<{ url: string; key: string }> {
    const { data, error } = await insforge.storage
      .from(this.bucketName)
      .upload(path, file);

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    if (!data) throw new Error("Upload returned no data");

    return {
      url: data.url,
      key: data.key,
    };
  }

  /**
   * Upload a file with auto-generated key
   */
  async uploadFileAuto(file: File | Blob): Promise<{ url: string; key: string }> {
    const { data, error } = await insforge.storage
      .from(this.bucketName)
      .uploadAuto(file);

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    if (!data) throw new Error("Upload returned no data");

    return {
      url: data.url,
      key: data.key,
    };
  }

  /**
   * Download a file from Insforge storage
   */
  async downloadFile(path: string): Promise<Blob> {
    const { data, error } = await insforge.storage
      .from(this.bucketName)
      .download(path);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
    if (!data) throw new Error("Download returned no data");
    return data;
  }

  /**
   * Delete a file from Insforge storage
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await insforge.storage
      .from(this.bucketName)
      .remove(path);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Serve a file to the response
   */
  async serveFile(path: string, res: Response, cacheTtlSec: number = 3600): Promise<void> {
    try {
      const blob = await this.downloadFile(path);
      
      // Set appropriate headers
      res.set({
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Length': blob.size.toString(),
        'Cache-Control': `public, max-age=${cacheTtlSec}`,
      });

      // Convert blob to buffer and send
      const buffer = Buffer.from(await blob.arrayBuffer());
      res.send(buffer);
    } catch (error) {
      console.error('Error serving file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving file' });
      }
    }
  }

  /**
   * Normalize object path (for compatibility with existing code)
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // If it's already a normalized path, return as-is
    if (rawPath.startsWith('/objects/')) {
      return rawPath;
    }

    // Extract path from Insforge URL if needed
    if (rawPath.includes('/api/storage/buckets/')) {
      const url = new URL(rawPath);
      const pathParts = url.pathname.split('/');
      const keyIndex = pathParts.indexOf('objects');
      if (keyIndex !== -1 && pathParts[keyIndex + 1]) {
        return `/objects/${pathParts.slice(keyIndex + 1).join('/')}`;
      }
    }

    return rawPath;
  }
}

export const insforgeStorage = new InsforgeStorageService();
