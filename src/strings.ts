import { ContextInfo, Helper } from "gd-sprest";
import { WebPartContext } from '@microsoft/sp-webpart-base';

// Sets the context information
export const setContext = (context: WebPartContext): void => {
    // Set the context
    ContextInfo.setPageContext(context.pageContext);

    // Load SP Core libraries
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Helper.loadSPCore().then(() => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        console.log(`[${Strings.ProjectName}]: Core SP Libraries loaded`)
    })
}

/** Global Constants **/
/** must come after setContext despite warnings or else the blanks will not be set before they are used.**/
const Strings = {
    ProjectName: "At-Risk Agreements",
    Sites: {
        main: {
            url: ContextInfo.webAbsoluteUrl,
            lists: {
                Agreements: "AtRiskAgreements",
                Roles: "ARARoles"
            }
        },
        jamis: {
            url: "/sites/Jamis_Data_API",
            lists: {
                ContractEP: "ContractEndPoint",
                InvoiceEP: "InvoiceEndPoint"
            }
        },
        oppnet: {
            url: "/sites/OppNet",
            lists: {
                ContractEP: "ConctractEndPoint",
                InvoiceEP: "InvoiceEndPoint",
                JobEP: "JobEndPoint",
                ProjectEP: "ProjectEndPoint"
            }
        },
        lookups: {
            url: "/sites/Dev-Sandbox",
            lists: {
                Entities: "Entities",
                OGPresidents: "OGPresidents"
            }
        }
    },
    Colors: {
        standard: {
            BlueFill: "#D4E7F6",
            BlueColor: "#0068B8",
            RedFill: "#FABBC3",
            RedColor: "#A30E15",
            GreenFill: "#CAF0CC",
            GreenColor: "#437406",
            GrayFill: "#f3f2f1",
            GrayColor: "#605e5c",
            PurpleFill: "#C3CAF9",
            PurpleColor: "#183EE7",
            YellowFill: "#FFEBC0",
            YellowColor: "#8F6200",
            LilacFill: "#E5D2E3",
            LilacColor: "#86417B",
            OrangeFill: "#FFE5B4",
            OrangeColor: "#E67E22",
            SageFill: "#CAEEE9",
            SageColor: "#007564",
            SPOTealColor: "#03787C",
            SPOBlueColor: "#0078D4",
            ErrorMessageRed: "#a4262c"
        },
        koniag: {
            blue: "#003057",
            teal: "#005c6c",
            gray: "#DFE3E5",
            blueGray: "#ccd6dd"
        }
    },
    Version: "1.0.0.1"
};
export default Strings;