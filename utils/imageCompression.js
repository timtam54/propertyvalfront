/**
 * Compress an image file to reduce its size while maintaining quality
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default 1920px)
 * @param {number} maxHeight - Maximum height (default 1080px)
 * @param {number} quality - Compression quality 0-1 (default 0.8)
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
export const compressImage = (file, maxWidth = 1600, maxHeight = 1200, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        // Log compression results
        const originalSize = event.target.result.length;
        const compressedSize = compressedBase64.length;
        const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        
        console.log(`Image compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
        
        resolve(compressedBase64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<string[]>} - Array of base64 encoded compressed images
 */
export const compressImages = async (files, onProgress = null) => {
  const compressed = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const compressedImage = await compressImage(files[i]);
      compressed.push(compressedImage);
      
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`Failed to compress image ${files[i].name}:`, error);
      // Skip failed images rather than failing entirely
    }
  }
  
  return compressed;
};

/**
 * Calculate total size of base64 images
 * @param {string[]} images - Array of base64 encoded images
 * @returns {number} - Total size in MB
 */
export const calculateImageSize = (images) => {
  const totalBytes = images.reduce((sum, img) => sum + img.length, 0);
  return totalBytes / 1024 / 1024; // Convert to MB
};
