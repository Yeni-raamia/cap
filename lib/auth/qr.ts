/* Génération de QR code (data URL PNG) pour l'enrôlement 2FA.
 * Isolé de lib/auth/totp.ts, qui reste sans dépendance. */
import QRCode from "qrcode";

/** Encode un texte (ex. URL otpauth://) en data URL PNG affichable dans une <img>. */
export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 220, errorCorrectionLevel: "M" });
}
