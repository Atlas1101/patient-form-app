// Props required by AddressFields
interface AddressFieldsProps {
    form: UseFormReturn<PatientFormData>; // Pass full form object
    index: number;
    // The 'field' object from useFieldArray map contains the unique id ('rhfId' in this case)
    field: FieldArrayWithId<PatientFormData, "addresses", "rhfId">;
    removeAddressRow: (index: number) => void;

    // Props for SHARED City search state/handlers (managed in PatientForm)
    cities: ApiCity[];
    cityLoading: boolean;
    cityQuery: string;
    isCityPopoverOpen: boolean;
    handleCityInputChange: (query: string) => void;
    setIsCityPopoverOpen: (isOpen: boolean) => void; // Allow child to toggle shared popover
}

// src/components/PatientForm/AddressFields.tsx

import React, { useState, useEffect } from "react";
import { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import { toast } from "sonner"; // Use sonner
import useDebounce from "@/lib/utils/UseDebounce"; // Assuming path
import { fetchStreets } from "@/lib/api"; // Fetch function
import { PatientFormData, ApiCity, ApiStreet } from "@/lib/schema"; // Types
import { cn } from "@/lib/utils";

// UI Components (import all needed ones: Button, FormField, Input, Popover, Command, etc.)
import { Button } from "@/components/ui/button";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown, Trash2, Loader2 } from "lucide-react";

// Constants can be defined here or imported
const DEBOUNCE_DELAY = 350;
const MIN_QUERY_LENGTH = 2;

// Props Interface defined above
interface AddressFieldsProps {
    form: UseFormReturn<PatientFormData>;
    index: number;
    field: FieldArrayWithId<PatientFormData, "addresses", "rhfId">; // Use field.rhfId for key
    removeAddressRow: (index: number) => void;
    cities: ApiCity[];
    cityLoading: boolean;
    cityQuery: string;
    isCityPopoverOpen: boolean; // Shared city popover state
    handleCityInputChange: (query: string) => void;
    setIsCityPopoverOpen: (isOpen: boolean) => void; // To control the shared popover
    isOnlyAddress: boolean;
}

export function AddressFields({
    form,
    index,

    removeAddressRow,
    // City search props passed down:
    cities,
    cityLoading,
    cityQuery,
    isCityPopoverOpen,
    handleCityInputChange,
    setIsCityPopoverOpen,
}: AddressFieldsProps) {
    // Get required methods from form
    const { control, setValue, getValues, watch } = form;

    // --- Internal State for Street Search ---
    const [streetQuery, setStreetQuery] = useState("");
    const [streets, setStreets] = useState<ApiStreet[]>([]);
    const [streetLoading, setStreetLoading] = useState(false);
    const [isStreetPopoverOpen, setIsStreetPopoverOpen] = useState(false);

    // Watch the city code *for this specific address row* directly from RHF state
    const cityCode = watch(`addresses.${index}.cityCode`);

    // Debounce the internal street query state
    const debouncedStreetQuery = useDebounce(streetQuery, DEBOUNCE_DELAY);

    // Effect to fetch streets when debounced query or cityCode changes
    useEffect(() => {
        // Only fetch if we have a city and a valid debounced query
        if (
            cityCode &&
            debouncedStreetQuery &&
            debouncedStreetQuery.trim().length >= MIN_QUERY_LENGTH
        ) {
            const fetchStreetData = async () => {
                setStreetLoading(true);
                setStreets([]); // Clear previous results
                try {
                    const results = await fetchStreets(
                        debouncedStreetQuery,
                        cityCode
                    );
                    setStreets(results);
                } catch (error: unknown) {
                    console.error(
                        `Failed to fetch streets for address index ${index}:`,
                        error
                    );
                    setStreets([]);
                    toast.error("Error Fetching Streets", {
                        description:
                            error instanceof Error
                                ? error.message
                                : "Could not fetch street data.",
                    });
                } finally {
                    setStreetLoading(false);
                }
            };
            fetchStreetData();
        } else {
            setStreets([]); // Clear if no city or query is too short
        }
    }, [debouncedStreetQuery, cityCode, index]); // Dependencies for street fetch

    // Handler for internal street input change
    const handleStreetInputChange = (query: string) => {
        setStreetQuery(query);
    };

    // --- JSX for the Address Row ---
    return (
        // Use the unique RHF ID for the React key in the parent map
        <div className="border p-4 rounded space-y-4 relative">
            {/* Remove Button */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-destructive hover:text-destructive"
                onClick={() => removeAddressRow(index)}
                aria-label="Remove address"
                // Optionally disable if it's the last address (would need addressFields.length passed down)
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            {/* Address Type Select */}
            <FormField
                control={control} // Use control from form prop
                name={`addresses.${index}.addressType`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address Type</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Home">Home</SelectItem>
                                <SelectItem value="Work">Work</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* City Combobox (Uses state/handlers passed down) */}
            <FormField
                control={control}
                name={`addresses.${index}.cityCode`} // Controls the city code value
                render={({ field: cityControllerField }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>City</FormLabel>
                        {/* Uses the shared popover state from parent */}
                        <Popover
                            open={isCityPopoverOpen}
                            onOpenChange={setIsCityPopoverOpen}
                            modal={true}
                        >
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full justify-between",
                                            !cityControllerField.value &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        {/* Display name for the selected code */}
                                        {getValues(
                                            `addresses.${index}.cityName`
                                        ) || "Select city..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                {/* Uses shared query state and input handler */}
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Search city..."
                                        value={cityQuery}
                                        onValueChange={handleCityInputChange}
                                    />
                                    <CommandList>
                                        {/* Uses shared loading state and results */}
                                        <CommandEmpty>
                                            {cityLoading
                                                ? "Loading..."
                                                : cityQuery.length <
                                                  MIN_QUERY_LENGTH
                                                ? "Type more to search"
                                                : "No city found."}
                                        </CommandEmpty>
                                        {cityLoading && (
                                            <div className="p-2 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            </div>
                                        )}
                                        {!cityLoading && cities.length > 0 && (
                                            <CommandGroup>
                                                {cities.map((city: ApiCity) => (
                                                    <CommandItem
                                                        key={
                                                            city._id ??
                                                            city.סמל_ישוב
                                                        } // Use correct API key
                                                        value={city.שם_ישוב} // Use correct API key
                                                        onSelect={() => {
                                                            const setValueOptions =
                                                                {
                                                                    shouldValidate:
                                                                        true,
                                                                    shouldDirty:
                                                                        true,
                                                                };
                                                            // Set form values using correct API keys
                                                            setValue(
                                                                `addresses.${index}.cityCode`,
                                                                city.סמל_ישוב,
                                                                setValueOptions
                                                            );
                                                            setValue(
                                                                `addresses.${index}.cityName`,
                                                                city.שם_ישוב,
                                                                setValueOptions
                                                            );
                                                            // Reset street fields when city changes
                                                            setValue(
                                                                `addresses.${index}.streetCode`,
                                                                "",
                                                                setValueOptions
                                                            );
                                                            setValue(
                                                                `addresses.${index}.streetName`,
                                                                "",
                                                                {
                                                                    shouldDirty:
                                                                        true,
                                                                }
                                                            );
                                                            setValue(
                                                                `addresses.${index}.streetNumber`,
                                                                1,
                                                                setValueOptions
                                                            ); // Reset to default valid number
                                                            setStreetQuery(""); // Reset local street search
                                                            setStreets([]);
                                                            setIsCityPopoverOpen(
                                                                false
                                                            ); // Close shared popover
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                cityControllerField.value ===
                                                                    city.סמל_ישוב
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {city.שם_ישוב}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Street Combobox (Uses internal state) */}
            <FormField
                control={control}
                name={`addresses.${index}.streetCode`}
                render={({ field: streetControllerField }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Street</FormLabel>
                        <Popover
                            open={isStreetPopoverOpen}
                            onOpenChange={setIsStreetPopoverOpen}
                            modal={true}
                        >
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={!cityCode}
                                        className={cn(
                                            "w-full justify-between",
                                            !streetControllerField.value &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        {getValues(
                                            `addresses.${index}.streetName`
                                        ) || "Select street..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command shouldFilter={false}>
                                    {/* Uses internal query state and handler */}
                                    <CommandInput
                                        placeholder="Search street..."
                                        value={streetQuery}
                                        onValueChange={handleStreetInputChange}
                                        disabled={!cityCode}
                                    />
                                    <CommandList>
                                        {/* Uses internal loading state and results */}
                                        <CommandEmpty>
                                            {streetLoading
                                                ? "Loading..."
                                                : !cityCode
                                                ? "Select city first."
                                                : streetQuery.length <
                                                  MIN_QUERY_LENGTH
                                                ? "Type more to search"
                                                : "No street found."}
                                        </CommandEmpty>
                                        {streetLoading && (
                                            <div className="p-2 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            </div>
                                        )}
                                        {!streetLoading &&
                                            streets.length > 0 && (
                                                <CommandGroup>
                                                    {streets.map(
                                                        (street: ApiStreet) => (
                                                            <CommandItem
                                                                key={
                                                                    street._id ??
                                                                    `${street.סמל_ישוב}-${street.סמל_רחוב}`
                                                                } // Use correct API key
                                                                value={
                                                                    street.שם_רחוב
                                                                } // Use correct API key
                                                                onSelect={() => {
                                                                    const setValueOptions =
                                                                        {
                                                                            shouldValidate:
                                                                                true,
                                                                            shouldDirty:
                                                                                true,
                                                                        };
                                                                    // Convert street code to string before setting
                                                                    const streetCodeAsString =
                                                                        String(
                                                                            street.סמל_רחוב
                                                                        );

                                                                    setValue(
                                                                        `addresses.${index}.streetCode`,
                                                                        streetCodeAsString, // Use string version
                                                                        setValueOptions
                                                                    );
                                                                    setValue(
                                                                        `addresses.${index}.streetName`,
                                                                        street.שם_רחוב,
                                                                        setValueOptions
                                                                    );
                                                                    setIsStreetPopoverOpen(
                                                                        false
                                                                    );
                                                                    setStreetQuery(
                                                                        ""
                                                                    ); // Clear local search state
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        streetControllerField.value ===
                                                                            street.סמל_רחוב
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                {street.שם_רחוב}
                                                            </CommandItem>
                                                        )
                                                    )}
                                                </CommandGroup>
                                            )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Street Number Input */}
            <FormField
                control={control}
                name={`addresses.${index}.streetNumber`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Street Number</FormLabel>
                        <FormControl>
                            <Input
                                type="number" // Keep type="number" for native controls if desired
                                placeholder="No."
                                {...field}
                                // Let RHF/Zod handle parsing/coercion; ensure value is controlled
                                onChange={(event) =>
                                    field.onChange(
                                        event.target.value === ""
                                            ? undefined
                                            : Number(event.target.value)
                                    )
                                } // Pass number or undefined
                                value={field.value ?? ""} // Handle potential undefined/null from RHF
                                className="w-24"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Comments Textarea */}
            <FormField
                control={control}
                name={`addresses.${index}.comments`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address Comments</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Optional notes (e.g., floor, entrance)"
                                className="resize-none"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
