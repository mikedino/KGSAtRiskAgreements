import { Helper, SPTypes } from "gd-sprest";
import Strings from "../../../strings";

/** SharePoint assets for the current site - installed on first run */
export const Configuration = Helper.SPConfig({
    ListCfg: [
        {
            ListInformation: {
                Title: Strings.Sites.main.lists.Agreements,
                Description: "At-Risk Agreements - feeds the ARA Application",
                OnQuickLaunch: false,
                BaseTemplate: SPTypes.ListTemplateType.GenericList,
                //Hidden: true
            },
            TitleFieldDescription: "ATR-ENTITY-YEAR-NUMBER",
            CustomFields: [
                {
                    name: "projectName",
                    title: "Project Name",
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "contractId",
                    title: "Contract Id",
                    type: Helper.SPCfgFieldType.Text,
                    description: "Stores the ID so the edit form can quickly find the matching contract"
                },
                {
                    name: "invoice",
                    title: "Invoice",
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "contractType",
                    title: "Conract Type",
                    type: Helper.SPCfgFieldType.Choice,                    
                    choices: ["Cost Plus/Reimbursable", "FFP/LOE", "Hybrid", "T&amp;M", "LH"]
                } as Helper.IFieldInfoChoice,
                {
                    name: "riskStart",
                    title: "Risk Start Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateOnly
                } as Helper.IFieldInfoDate,
                {
                    name: "riskEnd",
                    title: "Risk End Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateOnly
                } as Helper.IFieldInfoDate,
                {
                    name: "popEnd",
                    title: "PoP End Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateOnly
                } as Helper.IFieldInfoDate,
                {
                    name: "entity",
                    title: "Entity",
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "projectMgr",
                    title: "Project Manager",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "contractMgr",
                    title: "Contract Manager",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "cmDecision",
                    title: "CM Decision",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Pending", "Approved", "Rejected"],
                    defaultValue: "Pending"
                } as Helper.IFieldInfoChoice,
                {
                    name: "cmComment",
                    title: "CM Comment",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,
                {
                    name: "cmDecisionDate",
                    title: "CM Decision Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime
                } as Helper.IFieldInfoDate,
                {
                    name: "riskReason",
                    title: "At-Risk Reason",
                    description: "Reason for being At-Risk",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Lack of Funding", "PoP End"]
                } as Helper.IFieldInfoChoice,
                {
                    name: "riskFundingRequested",
                    title: "Risk Funding Requested",
                    type: Helper.SPCfgFieldType.Currency,
                    decimals: 2
                } as Helper.IFieldInfoCurrency,
                {
                    name: "riskJustification",
                    title: "Risk Justification",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.RichText
                } as Helper.IFieldInfoNote,
                {
                    name: "contractName",
                    title: "Contract Name",
                    defaultValue: "New Award",
                    readOnly: true,
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "programName",
                    title: "Program Name",
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "araStatus",
                    title: "Status",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Resolved", "Cancelled"],
                    defaultValue: "Submitted"
                } as Helper.IFieldInfoChoice,
                {
                    name: "entityGM",
                    title: "Entity GM",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "OGPresident",
                    title: "OG President",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "OGPresidentApproval",
                    title: "OG President Approval",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Approved","Rejected","Not Started"],
                    defaultValue: "Not Started"
                } as Helper.IFieldInfoChoice,
                {
                    name: "OGPresidentComment",
                    title: "OG President Comment",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,
                {
                    name: "OGPresidentSignDate",
                    title: "OG President Signed Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime
                } as Helper.IFieldInfoDate,
                {
                    name: "SVPContracts",
                    title: "SVP Contracts",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "SVPContractsApproval",
                    title: "SVP Contracts Approval",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Approved","Rejected","Not Started"],
                    defaultValue: "Not Started"
                } as Helper.IFieldInfoChoice,
                {
                    name: "SVPContractsComment",
                    title: "SVP Contracts Comment",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,
                {
                    name: "SVPContractsSignDate",
                    title: "SVP Contracts Signed Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime
                } as Helper.IFieldInfoDate,
                {
                    name: "LOBPresident",
                    title: "LOB President",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "LOBPresidentApproval",
                    title: "LOB President Approval",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Approved","Rejected","Not Started"],
                    defaultValue: "Not Started"
                } as Helper.IFieldInfoChoice,
                {
                    name: "LOBPresidentComment",
                    title: "LOB President Comment",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,
                {
                    name: "LOBPresidentSignDate",
                    title: "LOB President Signed Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime
                } as Helper.IFieldInfoDate,
                {
                    name: "CEO",
                    title: "CEO",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "CEOApproval",
                    title: "CEO Approval",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Approved","Rejected","Not Started"],
                    defaultValue: "Not Started"
                } as Helper.IFieldInfoChoice,
                {
                    name: "CEOComment",
                    title: "CEO Comment",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,
                {
                    name: "CEOSignDate",
                    title: "CEO Signed Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime
                } as Helper.IFieldInfoDate,
            ],
            ViewInformation: [
                {
                    ViewName: "All Items",
                    Default: true,
                    ViewQuery: "<OrderBy><FieldRef Name=\"Created\" Ascending=\"FALSE\" /></OrderBy>",
                    ViewFields: [
                        "LinkTitle", "projectName", "contractType", "riskStart", "riskEnd", "popEnd", 
                        "entity", "projectMgr", "riskReason", "riskFundingRequested"
                    ]
                }
            ]
        }
    ]
})
