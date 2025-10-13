export async function encodeFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error(`ファイルの読み込みに失敗しました: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}
