// src/components/PatientForm/PhoneFields.tsx
import React from "react";
import { UseFormReturn, FieldArrayWithId } from "react-hook-form"; // Import necessary types
import { PatientFormData } from "@/lib/schema"; // Import types

// UI Components
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
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

// Update props interface
interface PhoneFieldsProps {
    form: UseFormReturn<PatientFormData>; // Pass full form object
    index: number;
    // Use the specific field type from RHF
    field: FieldArrayWithId<PatientFormData, "phoneNumbers", "rhfId">;
    removePhoneRow: (index: number) => void;
    handleMainPhoneChange: (index: number) => void; // Handler for main logic
    isOnlyPhone: boolean;
}

export function PhoneFields({
    form,
    index,

    removePhoneRow,
    handleMainPhoneChange,
}: PhoneFieldsProps) {
    const { control } = form; // Get control from form prop

    return (
        // Use field.rhfId for the key in the parent map
        <div className="flex items-start space-x-4 border p-4 rounded">
            <div className="flex-grow space-y-2">
                {/* Type Select */}
                <FormField
                    control={control} // Use control from form prop
                    name={`phoneNumbers.${index}.type`}
                    render={(
                        { field: typeField } // Renamed field to avoid conflict
                    ) => (
                        <FormItem>
                            <FormLabel className="sr-only">Type</FormLabel>
                            <Select
                                onValueChange={typeField.onChange}
                                defaultValue={typeField.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Mobile">
                                        Mobile
                                    </SelectItem>
                                    <SelectItem value="Home">Home</SelectItem>
                                    <SelectItem value="Work">Work</SelectItem>

                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* Number Input */}
                <FormField
                    control={control}
                    name={`phoneNumbers.${index}.number`}
                    render={(
                        { field: numberField } // Renamed field
                    ) => (
                        <FormItem>
                            <FormLabel className="sr-only">Number</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Phone number"
                                    {...numberField}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* isMain Checkbox */}
                <FormField
                    control={control}
                    name={`phoneNumbers.${index}.isMain`}
                    render={(
                        { field: isMainField } // Renamed field
                    ) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                            <FormControl>
                                <Checkbox
                                    checked={isMainField.value}
                                    // Use the specific handler passed down for main logic
                                    onCheckedChange={(checked) => {
                                        isMainField.onChange(checked); // Update RHF state
                                        if (checked) {
                                            handleMainPhoneChange(index); // Call parent handler
                                        }
                                    }}
                                    // Disable logic might need access to phoneFields length from parent
                                    // disabled={isMainField.value && phoneFields.length === 1}
                                />
                            </FormControl>
                            <FormLabel className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Set as Main Phone
                            </FormLabel>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            {/* Remove Button */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePhoneRow(index)}
                aria-label="Remove phone number"
                className="text-destructive hover:text-destructive"
                // Disable logic might need access to phoneFields length from parent
                // disabled={field.isMain && phoneFields.length === 1}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}
