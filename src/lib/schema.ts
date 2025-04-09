// src/lib/schema.ts
import { z } from "zod";
// Assuming isValidIsraeliPhoneNumber here is Version 1 (Domestic Only) as confirmed
import { isValidIsraeliId, isValidIsraeliPhoneNumber } from "./validators";

// --- Enums ---
export const phoneTypeEnum = z.enum(["Home", "Mobile", "Work", "Other"], {
    required_error: "Phone type is required",
});
export const addressTypeEnum = z.enum(["Home", "Work", "Other"], {
    required_error: "Address type is required",
});
export const hmoEnum = z.enum(["Clalit", "Maccabi", "Mehuedet", "Leumit"], {
    required_error: "HMO is required",
});

// --- Sub-Schemas ---
export const phoneNumberSchema = z.object({
    // Use a unique identifier for field array keys, separate from potential data IDs
    // React Hook Form manages keys internally, so explicit 'id' isn't strictly needed here
    // unless your backend expects it or you use it for specific logic.
    type: phoneTypeEnum,
    number: z
        .string()
        .min(1, "Phone number is required")
        .refine(isValidIsraeliPhoneNumber, {
            // Uses the imported domestic-only validator
            message: "Invalid Israeli phone number format",
        }),
    isMain: z.boolean().default(false),
});

export const addressSchema = z.object({
    cityCode: z.string().min(1, "City selection is required"),
    cityName: z.string().min(1, "City name is required"), // Good practice to store for display/context
    streetCode: z.string().min(1, "Street selection is required"),
    streetName: z.string().min(1, "Street name is required"),
    streetNumber: z.coerce // Automatically convert input to number
        .number({ invalid_type_error: "Street number must be a number" })
        .int("Street number must be a whole number")
        .positive("Street number must be positive")
        .min(1, "Street number is required"),
    addressType: addressTypeEnum,
    comments: z.string().max(500, "Comments too long").optional(),
});

// --- Main Patient Schema ---
export const patientSchema = z.object({
    id: z
        .string()
        // Use .length() for clearer intent of exactly 9 digits
        .length(9, "ID must be exactly 9 digits")
        .refine(isValidIsraeliId, {
            message: "Invalid Israeli ID number",
        }),
    firstName: z.string().trim().min(1, { message: "First name is required" }),
    lastName: z.string().trim().min(1, { message: "Last name is required" }),
    phoneNumbers: z
        .array(phoneNumberSchema)
        .min(1, "At least one phone number is required")
        .superRefine((phones, ctx) => {
            const mainPhones = phones.filter((p) => p.isMain);
            if (mainPhones.length === 0) {
                // Add issue to the array root if no main number is selected
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `One phone number must be marked as main.`,
                    path: [], // Error applies to the whole array
                });
            } else if (mainPhones.length > 1) {
                // Add issue to each phone number that is wrongly marked as main
                phones.forEach((phone, index) => {
                    if (phone.isMain) {
                        ctx.addIssue({
                            path: [index, "isMain"], // Pinpoint the error to the specific checkbox
                            code: z.ZodIssueCode.custom,
                            message: `Only one phone can be main.`,
                        });
                    }
                });
            }
        }),
    hmo: hmoEnum,
    addresses: z
        .array(addressSchema)
        .min(1, "At least one address is required"),
});

// --- TypeScript Types ---
export type PatientFormData = z.infer<typeof patientSchema>;
export type PhoneNumberData = z.infer<typeof phoneNumberSchema>;
export type AddressData = z.infer<typeof addressSchema>;

// --- API Response Interfaces ---
// Consider moving these interfaces to a dedicated file (e.g., src/lib/apiTypes.ts or src/types/api.ts)
// if they are primarily used for API fetching logic rather than just schema definition.
export interface ApiCity {
    _id: number;
    סמל_ישוב: string; // City Code
    שם_ישוב: string; // City Name (Hebrew)
    // Add other fields if needed, e.g., שם_ישוב_לועזי
}

export interface ApiStreet {
    _id: number;
    סמל_רחוב: string; // Street Code
    שם_רחוב: string; // Street Name (Hebrew)
    סמל_ישוב: string; // City code it belongs to
}

export interface ApiResponse<T> {
    // Define structure based on actual data.gov.il response
    help: string;
    success: boolean;
    result: {
        resource_id: string;
        fields: { type: string; id: string }[];
        records: T[];
        _links: { start: string; next?: string };
        total: number;
        q?: string;
        filters?: object;
    };
}
