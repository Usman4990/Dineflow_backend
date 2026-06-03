// Normalize phone numbers to E.164 where possible (focused on Pakistan numbers)
const isAllDigits = (s) => /^\d+$/.test(s);

const formatToE164 = (input) => {
  if (!input && input !== 0) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Keep only digits and leading +
  let cleaned = raw.replace(/[^+\d]/g, '');

  // Convert 00-prefixed international format to +
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);

  // If it already starts with + and the rest are digits, validate length
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (isAllDigits(digits) && digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`;
    }
    return null;
  }

  // Now cleaned contains only digits
  if (!isAllDigits(cleaned)) return null;

  // Pakistan mobile numbers: 03XXXXXXXXX (11 digits)
  if (/^0?3\d{9}$/.test(cleaned)) {
    // remove leading 0 if present, then prefix 92
    const without0 = cleaned.length === 11 ? cleaned.slice(1) : cleaned;
    const e164 = `+92${without0}`;
    return e164;
  }

  // Already has country code 92 (e.g., 923XXXXXXXXX)
  if (/^92\d{9,12}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // If it's a 10-digit number starting with 3 (missing leading 0)
  if (/^3\d{9}$/.test(cleaned)) {
    return `+92${cleaned}`;
  }

  // Generic fallback: if digits length looks like E.164 (8-15), prefix +
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }

  return null;
};

module.exports = { formatToE164 };
