// Egyptian mobile numbers: 010, 011, 012 or 015 followed by 8 digits.

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Cleans a typed number into the local form 01XXXXXXXXX, or returns null if invalid. */
export function normalizePhone(input: string): string | null {
  let s = (input ?? "")
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[\s\-().]/g, "");
  if (s.startsWith("+20")) s = "0" + s.slice(3);
  else if (s.startsWith("0020")) s = "0" + s.slice(4);
  else if (s.startsWith("20") && s.length === 12) s = "0" + s.slice(2);
  return /^01[0125]\d{8}$/.test(s) ? s : null;
}

/** WhatsApp link with a ready-made message, e.g. https://wa.me/201001234567?text=... */
export function whatsappLink(phone: string, message: string): string | null {
  const local = normalizePhone(phone);
  if (!local) return null;
  return `https://wa.me/20${local.slice(1)}?text=${encodeURIComponent(message)}`;
}
