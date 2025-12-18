import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';

// Configure body size limit for this route (50MB for multiple image uploads)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'property-images';

/**
 * POST /api/upload
 * Upload images to Azure Blob Storage
 * Accepts multipart/form-data with 'files' field
 * Returns array of blob URLs
 */
export async function POST(request: NextRequest) {
  console.log('[Upload] Received upload request');

  try {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      console.error('[Upload] Azure Storage connection string not configured');
      return NextResponse.json(
        { error: 'Azure Storage not configured' },
        { status: 500 }
      );
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('[Upload] Error parsing form data:', formError);
      return NextResponse.json(
        { error: 'Failed to parse upload data. File may be too large.' },
        { status: 400 }
      );
    }
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file types (including HEIC/HEIF for iPhone photos)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const hasValidMimeType = allowedMimeTypes.includes(file.type);
      const hasValidExtension = allowedExtensions.includes(extension);

      // On iPhone PWA, MIME type may be empty or application/octet-stream
      // Also accept files with valid image extensions or that start with "image/"
      const isImageMime = file.type.startsWith('image/');
      const isAcceptable = hasValidMimeType || hasValidExtension || isImageMime || file.type === '' || file.type === 'application/octet-stream';

      if (!isAcceptable) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type || 'unknown'}. Allowed: images (jpg, png, webp, gif, heic, heif)` },
          { status: 400 }
        );
      }
    }

    // Connect to Azure Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

    // Ensure container exists
    await containerClient.createIfNotExists({ access: 'blob' });

    const uploadedUrls: string[] = [];

    // Map extensions to MIME types for fallback
    const extToMime: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'heic': 'image/heic',
      'heif': 'image/heif',
    };

    for (const file of files) {
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const blobName = `${timestamp}-${randomId}.${extension}`;

      // Get blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine content type - use file.type if valid, otherwise infer from extension
      let contentType = file.type;
      if (!contentType || contentType === 'application/octet-stream') {
        contentType = extToMime[extension] || 'image/jpeg';
      }

      // Upload to Azure
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });

      // Get the public URL
      uploadedUrls.push(blockBlobClient.url);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });

  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/upload
 * Delete an image from Azure Blob Storage
 * Accepts JSON body with 'url' field
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      return NextResponse.json(
        { error: 'Azure Storage not configured' },
        { status: 500 }
      );
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Extract blob name from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const blobName = pathParts[pathParts.length - 1];

    // Connect and delete
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
