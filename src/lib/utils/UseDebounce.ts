import { useState, useEffect } from "react";

/**
 * Custom hook that debounces a value.
 * Useful for delaying updates triggered by rapidly changing inputs (e.g., search fields).
 *
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value, which updates only after the specified delay has passed
 * without the original value changing.
 */
function useDebounce<T>(value: T, delay: number): T {
    // State to store the debounced value
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(
        () => {
            // Set up a timer that will update the debounced value after the delay
            const handler = setTimeout(() => {
                setDebouncedValue(value);
            }, delay);

            // --- Cleanup function ---
            // This function runs BEFORE the effect runs the next time (if value/delay changes)
            // OR when the component unmounts.
            return () => {
                // Clear the timeout if the value changes before the delay has finished
                clearTimeout(handler);
            };
        },
        [value, delay] // Only re-call effect if value or delay changes
    );

    // Return the debounced value (which only updates after the delay)
    return debouncedValue;
}

export default useDebounce;
