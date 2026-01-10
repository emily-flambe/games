/**
 * Sanitize user input to prevent XSS attacks by escaping HTML entities
 * @param input - The string to sanitize
 * @returns The sanitized string with HTML entities escaped
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Order matters: escape & first to prevent double-escaping
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize and validate chat messages
 * @param message - The chat message to validate
 * @returns Object containing validation status and sanitized message
 */
export function validateChatMessage(message: string): { valid: boolean; sanitized?: string; error?: string } {
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }
  
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (trimmedMessage.length > 500) {
    return { valid: false, error: 'Message must be 500 characters or less' };
  }
  
  const sanitized = sanitizeHTML(trimmedMessage);
  return { valid: true, sanitized };
}