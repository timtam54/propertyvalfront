import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side endpoint to fetch images from URLs and convert them to base64
 * This bypasses CORS restrictions that prevent browser-side fetching of Azure Blob URLs
 */
export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400 }
      );
    }

    // Limit to 3 images to prevent timeout
    const limitedUrls = urls.slice(0, 3);

    const base64Images: (string | null)[] = await Promise.all(
      limitedUrls.map(async (url: string) => {
        try {
          // Validate URL is from Azure Blob Storage or other trusted sources
          const parsedUrl = new URL(url);
          const allowedHosts = [
            'propertypitchstorage.blob.core.windows.net',
            'blob.core.windows.net'
          ];

          const isAllowed = allowedHosts.some(host =>
            parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host)
          );

          if (!isAllowed) {
            console.log(`[images-to-base64] Blocked URL from non-allowed host: ${parsedUrl.hostname}`);
            return null;
          }

          // Fetch the image with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per image

          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'Accept': 'image/*'
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.log(`[images-to-base64] Failed to fetch image: ${response.status} ${url}`);
            return null;
          }

          // Get content type
          const contentType = response.headers.get('content-type') || 'image/jpeg';

          // Convert to buffer and then base64
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');

          // Return as data URL
          return `data:${contentType};base64,${base64}`;
        } catch (error) {
          console.error(`[images-to-base64] Error fetching image ${url}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls but keep order
    const validImages = base64Images.filter((img): img is string => img !== null);

    return NextResponse.json({
      images: validImages,
      total_requested: limitedUrls.length,
      total_converted: validImages.length
    });

  } catch (error) {
    console.error('[images-to-base64] Error:', error);
    return NextResponse.json(
      { error: 'Failed to convert images' },
      { status: 500 }
    );
  }
}
