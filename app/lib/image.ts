'use client';

/**
 * Redimensiona/comprime uma imagem no navegador antes do upload.
 * Foto de celular (vários MB) → JPEG ~200-400KB, deixando o upload rápido
 * mesmo com o Storage em outra região. PDFs e não-imagens passam direto.
 */
export async function downscaleImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxDim / longest);
    if (scale === 1 && file.size < 600_000) {
      bitmap.close?.();
      return file; // já é pequena o bastante
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    const name = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file; // em caso de erro, sobe o original
  }
}
