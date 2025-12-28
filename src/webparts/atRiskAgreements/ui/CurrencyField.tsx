import React, { useState, useEffect, ChangeEvent, FC } from "react";
import { TextField, InputAdornment, TextFieldProps } from "@mui/material";

interface CurrencyFieldProps extends Omit<TextFieldProps, "value" | "onChange"> {
    value: number;
    onChange: (value: number) => void;
    decimals?: number; // Optional, default to 2
}

const CurrencyField: FC<CurrencyFieldProps> = ({ value, onChange, decimals = 2, ...rest }): JSX.Element => {
    // Format number as currency string with fixed decimals and without a $ sign
    const formatUSD = (val: number): string => {
        if (typeof val !== "number" || isNaN(val)) {
            return "0.00"; //
        }
        return new Intl.NumberFormat("en-US", {
            style: "decimal",
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(val);
    };

    // Parse string input into number (strip $, commas, etc)
    const parseUSD = (val: string): number => {
        const cleaned: string = val.replace(/[^0-9.]/g, "");
        const parsed: number = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    const [display, setDisplay] = useState<string>(() => formatUSD(value ?? 0));

    // Sync display when value prop changes (external updates)
    useEffect((): void => {
        setDisplay(formatUSD(value));
    }, [value, decimals]);

    // Update display string on typing
    const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
        setDisplay(e.target.value);
    };

    // On blur, parse & propagate numeric value, update formatted display
    const handleBlur = (): void => {
        const parsed: number = parseUSD(display);
        onChange(parsed);
        setDisplay(formatUSD(parsed));
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
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
            }}
        />
    );
};

export default CurrencyField;
