/**
 * Basic validation helpers.
 * Keeps route handlers clean by centralising input checks.
 */

export function isValidUUID(value: string | string[]): boolean {
    if (Array.isArray(value)) return false;
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

export function isValidDate(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime());
}

export function isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Returns an array of missing required fields from the body.
 * Usage: const missing = getMissingFields(req.body, ["first_name", "last_name"]);
 */
export function getMissingFields(
    body: Record<string, unknown>,
    requiredFields: string[]
): string[] {
    return requiredFields.filter(
        (field) => body[field] === undefined || body[field] === null || body[field] === ""
    );
}

/**
 * Validates that a string is not purely numeric.
 * Usage: isNotNumeric("John") => true, isNotNumeric("123") => false
 */
export function isNotNumeric(value: string): boolean {
    return !/^\d+$/.test(value.trim());
}

/**
 * Validates that a string contains only digits (no letters or special chars).
 * Usage: isNumericOnly("1234567890") => true, isNumericOnly("123abc") => false
 */
export function isNumericOnly(value: string): boolean {
    return /^\d+$/.test(value.trim());
}

/**
 * Validates a phone number (digits, spaces, dashes, parentheses, + sign).
 * Usage: isValidPhoneNumber("+1 (555) 123-4567") => true
 */
export function isValidPhoneNumber(value: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(value.trim()) && /\d/.test(value);
}

/**
 * Calculates age from date of birth and validates age range.
 * Returns error message if invalid, null if valid.
 * Usage: const error = validateAge("2010-05-15", 4, 17);
 */
export function validateAge(dateOfBirth: string, minAge: number, maxAge: number): string | null {
    if (!isValidDate(dateOfBirth)) {
        return "Invalid date of birth format";
    }

    const dob = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())
        ? age - 1
        : age;

    if (adjustedAge < minAge) {
        return `Child must be at least ${minAge} years old`;
    }

    if (adjustedAge > maxAge) {
        return `Child must be under ${maxAge + 1} years old`;
    }

    return null;
}
