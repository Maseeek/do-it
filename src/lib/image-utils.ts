export const MAX_PROOF_PHOTOS = 6;
export const MAX_PROOF_FILE_BYTES = 20 * 1024 * 1024;
// Base64 adds roughly one third to a JPEG's binary size.
export const MAX_PROOF_DATA_URL_LENGTH = 240 * 1024;

export function validateProofFile(file: Pick<File, 'type' | 'size'>) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file, such as a JPEG or PNG.');
  if (file.size === 0) throw new Error('That photo is empty. Choose another image.');
  if (file.size > MAX_PROOF_FILE_BYTES) throw new Error('Choose a photo smaller than 20 MB.');
}

/** Bound both dimensions and stored size so a detailed photo cannot exhaust local storage. */
export async function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<string> {
  validateProofFile(file);
  if (!Number.isFinite(maxDimension) || maxDimension < 1 || !Number.isFinite(quality) || quality <= 0 || quality > 1) {
    throw new Error('Invalid image compression settings.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('This photo could not be opened. Try a JPEG or PNG.'));
      image.src = objectUrl;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('This photo has no image content.');
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    let width = Math.max(1, Math.round(img.naturalWidth * scale));
    let height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not process this photo. Try again or use another browser.');

    for (let attempt = 0; attempt < 12; attempt++) {
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      // JPEG has no alpha channel; keep transparent PNGs legible on white.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.startsWith('data:image/jpeg;base64,') && dataUrl.length <= MAX_PROOF_DATA_URL_LENGTH) return dataUrl;
      if (quality > 0.5) quality = Math.max(0.5, quality - 0.15);
      else {
        width = Math.max(1, Math.round(width * 0.75));
        height = Math.max(1, Math.round(height * 0.75));
      }
    }
    throw new Error('This photo is too complex to save. Try a smaller image.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressMultipleImages(files: File[] | FileList, maxDimension = 1200, quality = 0.8): Promise<string[]> {
  const selected = Array.from(files);
  if (selected.length > MAX_PROOF_PHOTOS) throw new Error(`Add up to ${MAX_PROOF_PHOTOS} photos per check-in.`);
  selected.forEach(validateProofFile);
  const images: string[] = [];
  // Decode one image at a time to avoid holding several full camera photos in memory.
  for (const file of selected) images.push(await compressImage(file, maxDimension, quality));
  return images;
}
