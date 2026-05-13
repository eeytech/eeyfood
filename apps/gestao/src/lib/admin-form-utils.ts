const MAX_IMAGE_FILE_SIZE = 2 * 1024 * 1024;

export const getStringValue = (value: FormDataEntryValue | null) => {
  return typeof value === "string" ? value.trim() : "";
};

export const getOptionalStringValue = (value: FormDataEntryValue | null) => {
  const normalizedValue = getStringValue(value);
  return normalizedValue.length > 0 ? normalizedValue : undefined;
};

export const getNumberValue = (value: FormDataEntryValue | null) => {
  const normalizedValue = getStringValue(value).replace(",", ".");
  return Number(normalizedValue);
};

export const getBooleanValue = (value: FormDataEntryValue | null) => {
  return value === "on";
};

export const getFileValue = (value: FormDataEntryValue | null) => {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
};

export const convertImageFileToDataUrl = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem válido.");
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return `data:${file.type};base64,${base64}`;
};
