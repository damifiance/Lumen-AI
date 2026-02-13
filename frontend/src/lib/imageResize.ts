/**
 * Crops and resizes an image to a square JPEG blob.
 *
 * @param imageSrc - The image source (data URL)
 * @param crop - Crop coordinates in natural image pixels
 * @param targetSize - Target width/height for square output (default: 400)
 * @returns Promise resolving to JPEG blob
 */
export async function cropAndResize(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  targetSize: number = 400
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        // Create canvas at target size
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw cropped image scaled to target size
        ctx.drawImage(
          image,
          crop.x,           // Source X
          crop.y,           // Source Y
          crop.width,       // Source width
          crop.height,      // Source height
          0,                // Destination X
          0,                // Destination Y
          targetSize,       // Destination width
          targetSize        // Destination height
        );

        // Convert canvas to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          0.9 // Quality (0-1)
        );
      } catch (err) {
        reject(err);
      }
    };

    image.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    image.src = imageSrc;
  });
}
