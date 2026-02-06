import React, { useState, useEffect, ChangeEvent, FC } from "react";
import { TextField, InputAdornment, TextFieldProps } from "@mui/material";

interface CurrencyFieldProps extends Omit<TextFieldProps, "value" | "onChange"> {
    value?: number; // allow undefined = not entered yet
    onChange: (value: number | undefined) => void; 
    decimals?: number; // Optional, default to 2
}

const CurrencyField: FC<CurrencyFieldProps> = ({
    value,
    onChange,
    decimals = 2,
    ...rest
}): JSX.Element => {
    // Format number as currency string with fixed decimals and without a $ sign
    const formatUSD = (val: number): string => {
        return new Intl.NumberFormat("en-US", {
            style: "decimal",
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(val);
    };

    // Parse string input into number (strip $, commas, etc)
    // returns undefined when empty
    const parseUSD = (val: string): number | undefined => {
        const cleaned = val.replace(/[^0-9.]/g, "");
        if (cleaned.trim() === "") return undefined;

        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? undefined : parsed;
    };

    // display is blank when value is undefined
    const [display, setDisplay] = useState<string>(() =>
        value === undefined ? "" : formatUSD(value)
    );

    // Sync display when value prop changes (external updates)
    useEffect((): void => {
        setDisplay(value === undefined ? "" : formatUSD(value));
    }, [value, decimals]);

    // Update display string on typing
    const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setDisplay(e.target.value);
    };

    // On blur, parse & propagate numeric value, update formatted display
    const handleBlur = (): void => {
        const parsed = parseUSD(display);

        // propagate undefined if empty/invalid
        onChange(parsed);

        // keep blank if undefined, otherwise format
        setDisplay(parsed === undefined ? "" : formatUSD(parsed));
    };

    return (
        <TextField
            {...rest}
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            inputMode="decimal"
            slotProps={{
                input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                }
            }}
        />
    );
};

export default CurrencyField;
