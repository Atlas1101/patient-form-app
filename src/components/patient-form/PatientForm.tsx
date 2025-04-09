// src/components/PatientForm.tsx
"use client";

import { useState, useEffect } from "react";
import {
    useForm,
    useFieldArray,
    // Import specific types needed
    UseFormReturn,
    SubmitHandler,
    FieldArrayWithId, // Import this for typing the 'field' prop
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Libs & Schema
import {
    patientSchema,
    PatientFormData,
    ApiCity,
    PhoneNumberData,
    AddressData,
} from "@/lib/schema";
import { fetchCities, postPatientData } from "@/lib/api"; // fetchStreets is used in AddressFields
// Assuming useDebounce hook is the default export from this file
import useDebounce from "@/lib/utils/UseDebounce";

// Import the actual field array components
import { AddressFields } from "./AddressFields"; // Adjust path if necessary
import { PhoneFields } from "./PhoneFields"; // Adjust path if necessary

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import {
    Form,
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
// Removed Checkbox import as it's likely inside PhoneFields
// Removed Textarea import as it's likely inside AddressFields
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removed Popover, Command components imports as they are likely inside AddressFields
// Removed Check, ChevronsUpDown imports as they are likely inside AddressFields

import { PlusCircle, Loader2 } from "lucide-react"; // Keep icons used directly

// --- Constants ---
const DEBOUNCE_DELAY = 350;
const MIN_QUERY_LENGTH = 2;

// --- Default Values ---
const defaultPhoneNumber: PhoneNumberData = {
    type: "Mobile",
    number: "",
    isMain: false,
};

// Matches AddressData - streetNumber is REQUIRED by schema
const defaultAddress: AddressData = {
    cityCode: "",
    cityName: "",
    streetCode: "",
    streetName: "",
    streetNumber: 1, // Use valid default number for required field
    addressType: "Home",
    comments: "",
};

export function PatientForm() {
    const form = useForm<PatientFormData>({
        // ***** THE FIX IS HERE *****
        resolver: zodResolver(patientSchema),
        // ***************************
        defaultValues: {
            id: "",
            firstName: "",
            lastName: "",
            phoneNumbers: [{ ...defaultPhoneNumber, isMain: true }],
            hmo: "Clalit",
            addresses: [defaultAddress],
        },
        mode: "onBlur",
    });

    const {
        fields: phoneFields,
        append: appendPhone,
        remove: removePhone,
    } = useFieldArray({
        control: form.control,
        name: "phoneNumbers",
        keyName: "rhfId", // Use a unique key name if default 'id' conflicts
    });

    const {
        fields: addressFields,
        append: appendAddress,
        remove: removeAddress,
    } = useFieldArray({
        control: form.control,
        name: "addresses",
        keyName: "rhfId", // Use a unique key name
    });

    // --- State for SHARED Async City Combobox ---
    const [cityQuery, setCityQuery] = useState("");
    const [cities, setCities] = useState<ApiCity[]>([]);
    const [cityLoading, setCityLoading] = useState(false);
    const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false); // Shared popover state

    const debouncedCityQuery = useDebounce(cityQuery, DEBOUNCE_DELAY);

    // --- Effect to Fetch Cities based on Debounced Query ---
    useEffect(() => {
        if (
            debouncedCityQuery &&
            debouncedCityQuery.trim().length >= MIN_QUERY_LENGTH
        ) {
            const fetchCityData = async () => {
                setCityLoading(true);
                setCities([]); // Clear previous results
                try {
                    const results = await fetchCities(debouncedCityQuery);
                    setCities(results);
                } catch (error: unknown) {
                    console.error("Failed to fetch cities:", error);
                    setCities([]); // Clear results on error
                    toast.error("Error Fetching Cities", {
                        description:
                            error instanceof Error
                                ? error.message
                                : "Could not fetch city data.",
                    });
                } finally {
                    setCityLoading(false);
                }
            };
            fetchCityData();
        } else {
            setCities([]); // Clear results if query is too short or empty
        }
    }, [debouncedCityQuery]); // Effect dependency

    // --- Handlers Passed Down or Used Here ---
    const handleCityInputChange = (query: string) => {
        setCityQuery(query);
        // If the popover isn't open, open it when user types enough
        if (!isCityPopoverOpen && query.length >= MIN_QUERY_LENGTH) {
            setIsCityPopoverOpen(true);
        } else if (query.length < MIN_QUERY_LENGTH) {
            // Optionally close if query becomes too short
            // setIsCityPopoverOpen(false);
        }
    };

    const addAddressRow = () => appendAddress(defaultAddress);
    const removeAddressRow = (index: number) => removeAddress(index);

    const addPhoneRow = () =>
        appendPhone({
            ...defaultPhoneNumber,
            isMain: phoneFields.length === 0, // Make first phone main by default
        });

    const removePhoneRow = (index: number) => {
        const currentPhones = form.getValues().phoneNumbers;
        const isRemovingMain = currentPhones[index]?.isMain;

        removePhone(index); // Remove the field first

        // RHF updates values asynchronously after remove, so re-get values
        // Use setTimeout to allow RHF state to update before checking
        setTimeout(() => {
            const remainingPhones = form.getValues().phoneNumbers;

            if (isRemovingMain && remainingPhones.length > 0) {
                // If the main phone was removed and others remain, check if another is main
                const isAnotherMain = remainingPhones.some((p) => p.isMain);
                // If no other phone is main, make the new first one main
                if (!isAnotherMain) {
                    form.setValue(`phoneNumbers.0.isMain`, true, {
                        shouldValidate: true,
                        shouldDirty: true,
                    });
                }
            }
            // Ensure validation triggers if the last phone is removed
            if (remainingPhones.length === 0) {
                form.trigger("phoneNumbers");
            }
        }, 0);
    };

    // This logic needs to interact with multiple phone fields, so it stays here
    const handleMainPhoneChange = (selectedIndex: number) => {
        form.getValues().phoneNumbers.forEach((_, index) => {
            if (index !== selectedIndex) {
                // Check if the field exists before trying to set its value
                if (form.getValues(`phoneNumbers.${index}`)) {
                    form.setValue(`phoneNumbers.${index}.isMain`, false, {
                        shouldDirty: true, // Only mark as dirty if changed
                    });
                }
            }
        });
        // Ensure the selected one is checked
        form.setValue(`phoneNumbers.${selectedIndex}.isMain`, true, {
            shouldDirty: true,
            shouldValidate: true, // Validate after changing the main phone
        });
        // form.trigger("phoneNumbers"); // Trigger validation for the whole array
    };

    // --- Submission Handler ---
    const onSubmit: SubmitHandler<PatientFormData> = async (data) => {
        console.log("Form Data Validated:", data);
        const submissionToastId = toast.loading("Submitting...");

        try {
            // postPatientData will either return SubmitSuccessResponse OR throw an error
            await postPatientData(data);

            // If we get here, it means result.success was true (otherwise postPatientData threw)
            toast.success("Success!", {
                id: submissionToastId,
                description: "Patient information submitted.",
            });
            form.reset(); // Reset form to RHF defaultValues

            // Reset local component state as well
            setCityQuery("");
            setCities([]);
            setCityLoading(false);
            setIsCityPopoverOpen(false);

            // The 'else' block is removed
        } catch (error: unknown) {
            // Errors from postPatientData (network, serverless function, etc.) are caught here
            console.error("Submission Handler Error:", error);
            const message =
                error instanceof Error
                    ? error.message // Use the error message thrown by postPatientData or Axios
                    : "Could not submit form. Please check connection or server logs."; // Generic fallback
            toast.error("Submission Error", {
                id: submissionToastId,
                description: message,
            });
        }
    };

    const { isSubmitting } = form.formState;

    // --- JSX Structure ---
    return (
        <Form {...form}>
            {" "}
            {/* Spreads RHF context */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Section 1: Patient Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Patient Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* ID */}
                        <FormField
                            control={form.control}
                            name="id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Patient ID</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter ID"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* First Name */}
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter first name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Last Name */}
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter last name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* HMO */}
                        <FormField
                            control={form.control}
                            name="hmo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>HMO</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value || ""}
                                    >
                                        {" "}
                                        {/* Ensure value is controlled */}
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select HMO" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Clalit">
                                                Clalit
                                            </SelectItem>
                                            <SelectItem value="Maccabi">
                                                Maccabi
                                            </SelectItem>
                                            <SelectItem value="Mehuedet">
                                                Meuhedet
                                            </SelectItem>
                                            <SelectItem value="Leumit">
                                                Leumit
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Section 2: Phone Numbers */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Phone Numbers</CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addPhoneRow}
                            aria-label="Add phone number"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Phone
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Render PhoneFields component from map */}
                        {phoneFields.map((field, index) => (
                            <PhoneFields
                                key={field.rhfId} // Use the keyName specified in useFieldArray
                                form={form as UseFormReturn<PatientFormData>} // Explicit cast might be needed depending on PhoneFields props definition
                                index={index}
                                field={
                                    field as FieldArrayWithId<
                                        PatientFormData,
                                        "phoneNumbers",
                                        "rhfId"
                                    >
                                } // Be explicit with FieldArrayWithId type
                                removePhoneRow={removePhoneRow}
                                handleMainPhoneChange={handleMainPhoneChange}
                                isOnlyPhone={phoneFields.length === 1} // Pass if needed for disabling remove/main logic
                            />
                        ))}
                        {/* Show array-level validation errors (e.g., "at least one main phone required") */}
                        <FormMessage>
                            {form.formState.errors.phoneNumbers?.root
                                ?.message ||
                                form.formState.errors.phoneNumbers?.message}
                        </FormMessage>
                    </CardContent>
                </Card>

                {/* Section 3: Addresses */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Addresses</CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAddressRow}
                            aria-label="Add address"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Address
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Render AddressFields component from map */}
                        {addressFields.map((field, index) => (
                            <AddressFields
                                key={field.rhfId} // Use the keyName specified
                                form={form as UseFormReturn<PatientFormData>}
                                index={index}
                                field={
                                    field as FieldArrayWithId<
                                        PatientFormData,
                                        "addresses",
                                        "rhfId"
                                    >
                                } // Be explicit
                                removeAddressRow={removeAddressRow}
                                // Pass city search state/handlers down
                                cities={cities}
                                cityLoading={cityLoading}
                                cityQuery={cityQuery}
                                isCityPopoverOpen={isCityPopoverOpen}
                                handleCityInputChange={handleCityInputChange}
                                setIsCityPopoverOpen={setIsCityPopoverOpen}
                                isOnlyAddress={addressFields.length === 1} // Pass if needed
                            />
                        ))}
                        {/* Show array-level validation errors */}
                        <FormMessage>
                            {form.formState.errors.addresses?.root?.message ||
                                form.formState.errors.addresses?.message}
                        </FormMessage>
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto" // Responsive width
                >
                    {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSubmitting ? "Submitting..." : "Submit Patient Info"}
                </Button>
            </form>
        </Form>
    );
}
