import "@testing-library/jest-dom";

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onerror: ((ev: ProgressEvent<FileReader>) => unknown) | null = null;

  readAsDataURL(blob: Blob): void {
    blob
      .arrayBuffer()
      .then((buffer) => {
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:${blob.type};base64,${base64}`;
        this.result = dataUrl;
        if (this.onload) {
          this.onload({} as ProgressEvent<FileReader>);
        }
      })
      .catch(() => {
        if (this.onerror) {
          this.onerror({} as ProgressEvent<FileReader>);
        }
      });
  }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;
