/**
 * Generates a WhatsApp URL that works on both mobile and desktop
 * Mobile: Uses whatsapp://send scheme for native app
 * Desktop: Uses https://wa.me for web
 */
export function getWhatsAppUrl(phoneNumber: string, message: string): string {
  const cleanedPhone = phoneNumber.replace(/\D/g, "").replace(/^\+/, "");
  const encodedMessage = encodeURIComponent(message);
  
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (isMobile) {
    // Use whatsapp:// scheme for native app on mobile
    return `whatsapp://send?phone=${cleanedPhone}&text=${encodedMessage}`;
  }
  
  // Use wa.me for desktop/web
  return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
}

/**
 * Opens WhatsApp chat with the given phone number and message
 */
export function openWhatsAppChat(phoneNumber: string, message: string): void {
  const url = getWhatsAppUrl(phoneNumber, message);
  window.open(url, "_blank");
}
