export type CompressOptions = {
  maxDimension?: number;
  quality?: number;
  mimeType?: string;
};

/**
 * Ridimensiona e comprime un'immagine direttamente nel browser dell'utente (lato client)
 * usando HTMLCanvasElement prima di effettuare l'upload verso il server.
 * Riduce la dimensione dei file da ~10-15MB a ~200-400KB sollevando la CPU del server.
 */
export async function compressImageOnClient(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // Se è un GIF animato, non alterare per non perdere l'animazione
  if (file.type === "image/gif") {
    return file;
  }

  const { maxDimension = 1920, quality = 0.82, mimeType = "image/jpeg" } = options;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let { width, height } = img;

        // Se l'immagine supera maxDimension, ridimensiona mantenendo le proporzioni
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Pulisci e disegna l'immagine sul canvas
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // Se il blob compresso è per assurdo più grande dell'originale, usa l'originale
              resolve(file);
              return;
            }

            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            console.info(
              `[Client Image Compression] File compresso da ${(file.size / (1024 * 1024)).toFixed(2)}MB a ${(compressedFile.size / 1024).toFixed(1)}KB (${width}x${height})`,
            );

            resolve(compressedFile);
          },
          mimeType,
          quality,
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
