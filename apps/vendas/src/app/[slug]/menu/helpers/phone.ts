export const normalizePhoneNumber = (phone: string) => {
  return phone.replace(/\D/g, "");
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!/^\d{11}$/.test(normalizedPhone)) {
    return false;
  }

  if (/^(\d)\1+$/.test(normalizedPhone)) {
    return false;
  }

  return normalizedPhone.charAt(2) === "9";
};
