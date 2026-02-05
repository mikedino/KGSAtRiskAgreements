// dayjs plugins
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

// format all errors from objects to line of text
export const formatError = (error: unknown): string => {
    if (error instanceof Error) {
        // If it's an instance of Error, use its message
        return error.message;
    } else if (typeof error === 'object' && error !== null) {
        // Check if the error has a 'response' key
        if ('response' in error) {
            const response = (error as { response: string }).response; // Type assertion
            try {
                // Parse the JSON string in the 'response' key
                const parsedResponse = JSON.parse(response);
                // Check if the parsed response has the expected structure
                if (parsedResponse.error && parsedResponse.error.message) {
                    return parsedResponse.error.message.value || "An unknown error occurred.";
                }
            } catch (e) {
                // If parsing fails, return a generic error message
                return `An error occurred while processing the error response. ${JSON.stringify(e)}`;
            }
        }
        // Fallback to extracting a message from the error object
        return (error as { message?: string }).message || JSON.stringify(error);
    } else {
        // Fallback for any other type
        return "An unknown error occurred.";
    }
};

const stringToColor = (string: string):string => {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

export const stringAvatar = (name: string): { sx: { bgcolor: string }; children: string } => {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
  };
}


/**
 * Helper function to encode list name with underscore or space or other characters that need encoding.
 * @param listName - The list name input (string).
 * @returns List name encoded
 */
export const encodeListName = (
    listName: string
): string => {
    return listName.replace(/[^a-zA-Z0-9]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(4, "0");
        return `_x${hex}_`;
    });
}


/**
 * Helper function to format dates like SPO like "today" or "yesterday" or long month and
 * day (e.g. January 11) or if in previous year it's mm/dd/yyyy
 * @param date - The date as a string or date object
 * @returns day or date as string
 */
export const formatSinceDate = (date?: string | Date): string => {
    if (!date) return "";

    const d = dayjs(date);
    const now = dayjs();

    if (d.isToday()) {
        return "today";
    }

    if (d.isYesterday()) {
        return "yesterday";
    }

    // Previous year → numeric date
    if (d.year() !== now.year()) {
        return d.format("MM/DD/YYYY");
    }

    // Same year → long month, no year
    return d.format("MMMM D");
};