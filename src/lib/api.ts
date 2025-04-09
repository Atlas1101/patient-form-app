// src/lib/api.ts
import axios, { AxiosError } from "axios";
import type {
    ApiCity,
    ApiResponse,
    ApiStreet,
    PatientFormData,
} from "./schema";

// --- Configuration ---
// Ensure these environment variables are set in your .env file (e.g., .env.local)
// Use VITE_ prefix for Vite projects, REACT_APP_ for Create React App, NEXT_PUBLIC_ for Next.js etc.
const CITIES_API_URL =
    import.meta.env.VITE_CITIES_API_URL ||
    "https://data.gov.il/api/3/action/datastore_search";
const CITIES_RESOURCE_ID =
    import.meta.env.VITE_CITIES_RESOURCE_ID ||
    "5c78e9fa-c2e2-4771-93ff-7f400a12f7ba";
const STREETS_API_URL =
    import.meta.env.VITE_STREETS_API_URL ||
    "https://data.gov.il/api/3/action/datastore_search";
const STREETS_RESOURCE_ID =
    import.meta.env.VITE_STREETS_RESOURCE_ID ||
    "9ad3862c-8391-4b2f-84a4-2d4c68625f4b";
const ZAPIER_WEBHOOK_URL =
    import.meta.env.VITE_ZAPIER_WEBHOOK_URL || "YOUR_ZAPIER_WEBHOOK_URL_HERE"; // Replace default or ensure it's set in .env!

if (ZAPIER_WEBHOOK_URL === "YOUR_ZAPIER_WEBHOOK_URL_HERE") {
    console.warn(
        "Zapier Webhook URL is not configured in environment variables!"
    );
}

// --- Axios Instance ---
const apiClient = axios.create({
    timeout: 10000, // 10 second timeout
    headers: {
        "Content-Type": "application/json",
    },
});

// --- Interceptors (Optional: for centralized logging/error handling) ---
apiClient.interceptors.request.use(
    (request) => {
        // console.log('Starting Request:', request.method?.toUpperCase(), request.url, request.params);
        return request;
    },
    (error) => {
        console.error("Request Error:", error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        // console.log('Response Status:', response.status);
        return response;
    },
    (error) => {
        console.error(
            "Response Error:",
            error.response?.status,
            error.response?.data || error.message
        );
        // You could add more sophisticated error handling here (e.g., redirect on 401)
        return Promise.reject(error);
    }
);

// --- API Fetching Functions ---

/**
 * Fetches cities from data.gov.il based on a query.
 * @param query Search query (min 2 chars).
 * @param signal AbortSignal for cancelling the request.
 * @returns Promise<ApiCity[]> A list of unique cities matching the query.
 * @throws {Error} Throws an error if the query is too short or if the API call fails.
 */
export const fetchCities = async (
    query: string,
    signal?: AbortSignal
): Promise<ApiCity[]> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
        // Return empty instead of throwing, as this is expected behavior for short queries in UI
        return [];
        // Or: throw new Error("Query must be at least 2 characters long.");
    }

    console.log(`Workspaceing cities for query: "${trimmedQuery}"`); // Keep development logging
    try {
        const response = await apiClient.get<ApiResponse<ApiCity>>(
            CITIES_API_URL,
            {
                params: {
                    resource_id: CITIES_RESOURCE_ID,
                    q: trimmedQuery,
                    limit: 20, // Consider making limit configurable if needed
                },
                signal,
            }
        );

        if (response.data.success && response.data.result.records) {
            // Ensure uniqueness based on city code ('סמל_ישוב')
            const uniqueCities = Array.from(
                new Map(
                    response.data.result.records.map((city) => [
                        city["סמל_ישוב"],
                        city,
                    ])
                ).values()
            );
            return uniqueCities;
        } else {
            // Throw an error if the API indicates failure
            throw new Error(
                `API Error fetching cities: ${
                    response.data.success
                        ? "Unknown reason"
                        : `API returned success: false. Response: ${JSON.stringify(
                              response.data
                          )}`
                }`
            );
        }
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log("City fetch request cancelled");
            return []; // Return empty array if request was cancelled, common case
        }
        // Log the specific error and re-throw a generic or the specific error
        console.error("Error fetching cities:", error);
        // Re-throw the error to be handled by the caller
        throw error instanceof Error
            ? error
            : new Error("Failed to fetch cities");
    }
};

/**
 * Fetches streets for a specific city from data.gov.il based on a query.
 * @param query Search query (min 2 chars).
 * @param cityCode The city code ('סמל_ישוב') to filter streets by.
 * @param signal AbortSignal for cancelling the request.
 * @returns Promise<ApiStreet[]> A list of unique streets matching the query and city code.
 * @throws {Error} Throws an error if query/cityCode are invalid or if the API call fails.
 */
export const fetchStreets = async (
    query: string,
    cityCode: string,
    signal?: AbortSignal
): Promise<ApiStreet[]> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
        // Return empty instead of throwing, as this is expected behavior for short queries in UI
        return [];
        // Or: throw new Error("Query must be at least 2 characters long.");
    }
    if (!cityCode) {
        throw new Error("City code is required to fetch streets.");
    }

    console.log(
        `Workspaceing streets for query: "${trimmedQuery}" in city: ${cityCode}`
    );
    try {
        const response = await apiClient.get<ApiResponse<ApiStreet>>(
            STREETS_API_URL,
            {
                params: {
                    resource_id: STREETS_RESOURCE_ID,
                    q: trimmedQuery,
                    filters: JSON.stringify({ סמל_ישוב: cityCode }),
                    limit: 20,
                },
                signal,
            }
        );

        if (response.data.success && response.data.result.records) {
            // Ensure uniqueness based on street code ('סמל_רחוב')
            const uniqueStreets = Array.from(
                new Map(
                    response.data.result.records.map((street) => [
                        street["סמל_רחוב"],
                        street,
                    ])
                ).values()
            );
            return uniqueStreets;
        } else {
            // Throw an error if the API indicates failure
            throw new Error(
                `API Error fetching streets: ${
                    response.data.success
                        ? "Unknown reason"
                        : `API returned success: false. Response: ${JSON.stringify(
                              response.data
                          )}`
                }`
            );
        }
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log("Street fetch request cancelled");
            return []; // Return empty array if request was cancelled
        }
        // Log the specific error and re-throw
        console.error("Error fetching streets:", error);
        throw error instanceof Error
            ? error
            : new Error("Failed to fetch streets");
    }
};

// --- Data Submission ---

/** Define a type for a successful Zapier response */
interface ZapierSuccessResponse {
    status: string;
    // Add other expected fields from Zapier if known
    [key: string]: unknown; // Use unknown instead of any
}

/**
 * Posts validated patient data to a Zapier webhook.
 * @param data The validated patient form data conforming to PatientFormData schema.
 * @returns Promise<ZapierSuccessResponse> The success response data from Zapier.
 * @throws {Error} Throws an error if the submission fails or Zapier indicates failure.
 */
export const postPatientData = async (
    data: PatientFormData
): Promise<ZapierSuccessResponse> => {
    console.log("Submitting data to Zapier:", data); // Keep development logging
    try {
        const response = await apiClient.post<ZapierSuccessResponse>(
            ZAPIER_WEBHOOK_URL,
            data
        );

        console.log("Zapier response:", response.data);

        // Check Zapier's response structure - adjust based on actual success indication
        // Common pattern: Zapier returns { status: 'success', ... }
        if (response.data && response.data.status === "success") {
            return response.data; // Return success payload from Zapier
        } else {
            // If Zapier didn't return a clear success status, treat as potential failure
            console.warn(
                "Zapier hook response did not indicate clear success:",
                response.data
            );
            throw new Error(
                `Zapier submission may have failed: ${JSON.stringify(
                    response.data
                )}`
            );
        }
    } catch (error) {
        console.error("Error submitting data to Zapier:", error);
        // Provide more context on axios errors if possible
        if (error instanceof AxiosError) {
            console.error(
                "Axios error details:",
                error.response?.data || error.message
            );
            // Throw a more specific error or the original AxiosError
            throw new Error(
                `Failed to submit data: ${
                    error.response?.data?.message || error.message
                }`
            );
        }
        // Re-throw generic error or the original error
        throw error instanceof Error
            ? error
            : new Error("Failed to submit data to Zapier");
    }
};

// --- Removed Debounce Utility ---
// Debouncing is now recommended to be handled in the UI layer (e.g., using a useDebouncedValue hook)
// or via features of a data-fetching library (like React Query/SWR).
