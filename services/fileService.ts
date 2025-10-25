
// Function to trigger a browser download for a JSON object
export const downloadJson = (data: unknown, filename: string) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Function to read and parse a JSON file from a file input
export const readJsonFile = <T,>(file: File): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const jsonData = JSON.parse(result) as T;
          resolve(jsonData);
        } else {
          reject(new Error("File content is not a string."));
        }
      } catch (error) {
        reject(new Error(`Error parsing JSON file: ${(error as Error).message}`));
      }
    };
    reader.onerror = (error) => {
      reject(new Error(`Error reading file: ${error}`));
    };
    reader.readAsText(file);
  });
};
