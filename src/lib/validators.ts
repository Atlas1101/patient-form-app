// src/lib/validators.ts

/**
 * Validates an Israeli ID number using the Luhn algorithm variant.
 * @param id The ID string to validate (should be 9 digits).
 * @returns True if the ID is valid, false otherwise.
 */
export function isValidIsraeliId(id: string): boolean {
    if (!id || id.length !== 9 || !/^\d{9}$/.test(id)) {
        // Ensure exactly 9 digits
        return false;
    }
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        let digit = Number(id[i]);
        let step = digit * ((i % 2) + 1);
        sum += step > 9 ? step - 9 : step;
    }
    return sum % 10 === 0;
}

export function isValidIsraeliPhoneNumber(phone: string): boolean {
    if (!phone) {
        return false;
    }

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // Regex for domestic format: Starts with 0, followed by a valid prefix, then 7 digits.
    // Prefixes: 02, 03, 04, 08, 09 (Landlines)
    //           050, 051, 052, 053, 054, 055, 056, 058, 059 (Mobiles - covered by 5[0-9])
    //           071-079 (Special/VoIP - covered by 7[1-9])
    const israelPhoneRegex = /^(0(2|3|4|5[0-9]|7[1-9]|8|9))\d{7}$/;

    return israelPhoneRegex.test(cleaned);
}
