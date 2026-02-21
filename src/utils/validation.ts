/**
 * Validation utilities for the application
 */

/**
 * Validates that a phone number contains exactly 10 digits and no other characters
 * @param phone - The phone number to validate
 * @returns true if the phone number is valid, false otherwise
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Check if the phone number contains only digits and is exactly 10 digits
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

/**
 * Formats a phone number by removing all non-digit characters
 * @param phone - The phone number to format
 * @returns The formatted phone number with only digits
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  return phone.replace(/\D/g, "");
};

/**
 * Validates email format with enhanced restrictions
 * @param email - The email to validate
 * @returns true if the email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  // Basic format check
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Additional checks
  if (!emailRegex.test(email)) return false;
  if (email.startsWith(".") || email.endsWith(".")) return false;
  if (email.includes("..")) return false;

  // Split into local and domain parts
  const [, domainPart] = email.split("@");

  // Check that domain has at least one dot and valid TLD
  if (!domainPart || !domainPart.includes(".")) return false;

  const domainParts = domainPart.split(".");
  const tld = domainParts[domainParts.length - 1];

  // TLD should be at least 2 characters and only letters
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;

  // Common invalid patterns
  if (email.includes(".@") || email.includes("@.")) return false;

  // More restrictive TLD check - should be a common TLD or reasonable length
  const commonTLDs = [
    "com",
    "org",
    "net",
    "edu",
    "gov",
    "mil",
    "int",
    "co",
    "uk",
    "de",
    "fr",
    "jp",
    "au",
    "ca",
    "cn",
    "in",
    "br",
    "ru",
    "it",
    "es",
    "nl",
    "se",
    "no",
    "dk",
    "fi",
    "pl",
    "be",
    "ch",
    "at",
    "cz",
    "hu",
    "ro",
    "bg",
    "hr",
    "sk",
    "si",
    "ee",
    "lv",
    "lt",
    "lu",
    "mt",
    "cy",
    "ie",
    "pt",
    "gr",
    "is",
    "li",
    "mc",
    "sm",
    "va",
    "ad",
    "gi",
    "gg",
    "je",
    "im",
  ];

  if (!commonTLDs.includes(tld.toLowerCase())) {
    // If not a common TLD, it should be a reasonable length (2-4 chars typically)
    if (tld.length > 4) return false;
  }

  return true;
};

/**
 * Formats a phone number for display
 * @param phone - The phone number to format
 * @returns The formatted phone number (e.g., (555) 123-4567)
 */
export const formatPhoneNumberDisplay = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Check if it's a valid 10-digit phone number
  if (cleaned.length !== 10) return phone;

  // Format as (XXX) XXX-XXXX
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};
