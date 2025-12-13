//import * as moment from "moment";
import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";

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


// get week start and end from today in ISO format
// export const getWeekRangeISO = (date: Date): { start: string; end: string } => {
//   const start = moment(date).startOf("week");   // Sunday 00:00:00
//   const end = moment(date).endOf("week");       // Saturday 23:59:59

//   return {
//     start: start.toISOString(),
//     end: end.toISOString()
//   };
// };

// // get week start and end from today in Friendly format
// export const getWeekRangeFriendly = (date: Date): { start: string; end: string } => {
//   const start = moment(date).startOf("week");   // Sunday 00:00:00
//   const end = moment(date).endOf("week");       // Saturday 23:59:59

//   return {
//     start: start.format('MM/D/YYYY'),
//     end: end.format('MM/D/YYYY')
//   };
// };

/**
   * Sends an email using SharePoint's REST API (SP.Utilities.Utility.SendEmail).
   * @param context - SPFx web part or extension context.
   * @param toRecipients - Array of recipient email addresses.
   * @param subject - Subject line for the email.
   * @param body - HTML body of the email.
   * @param ccRecipients - Optional array of Cc email addresses.
   * @returns Promise<void>
   */
export const sendEmailNotification = async (
  context: WebPartContext,
  toRecipients: string[],
  subject: string,
  body: string
): Promise<void> => {
  const webUrl = context.pageContext.web.absoluteUrl;
  const endpoint = `${webUrl}/_api/SP.Utilities.Utility.SendEmail`;
  const emailProps = {
    properties: {
      To: toRecipients,
      Subject: subject,
      Body: body,
    },
  };
  const response: SPHttpClientResponse = await context.spHttpClient.post(
    endpoint,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: "application/json;odata=nometadata",
        "Content-Type": "application/json;odata=nometadata"
      },
      body: JSON.stringify(emailProps),
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }
  console.log(`Email sent to: ${toRecipients.join(", ")}`);
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
