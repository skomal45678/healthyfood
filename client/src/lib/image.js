function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image. Try a JPG or PNG.'));
    };
    img.src = url;
  });
}

function draw(img, maxSize, quality) {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Resize before upload: smaller payloads are faster and cheaper for free
// vision models. Also returns a tiny thumbnail for the food log.
export async function compressImage(file, maxSize = 1024, quality = 0.8) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const { img, url } = await loadImage(file);
  try {
    return { dataUrl: draw(img, maxSize, quality), thumb: draw(img, 128, 0.6) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
