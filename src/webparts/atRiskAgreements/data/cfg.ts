import { Helper, SPTypes } from "gd-sprest";
import Strings from "../../../strings";

/** SharePoint assets for the current site - installed on first run */
export const Configuration = Helper.SPConfig({
    ListCfg: [
        /********************************************************************
         * Agreements (master record)
         ********************************************************************/
        {
            ListInformation: {
                Title: Strings.Sites.main.lists.Agreements,
                Description: "At-Risk Agreements - feeds the ARA Application",
                OnQuickLaunch: false,
                BaseTemplate: SPTypes.ListTemplateType.GenericList
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
                    type: Helper.SPCfgFieldType.Text,
                    indexed: true
                },
                {
                    name: "og",
                    title: "Operating Group (OG)",
                    type: Helper.SPCfgFieldType.Text,
                    indexed: true
                },
                {
                    name: "projectMgr",
                    title: "Project Manager",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
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
                    choices: ["Draft", "Submitted", "Under Review", "Mod Review", "Approved", "Rejected", "Resolved", "Canceled"],
                    defaultValue: "Submitted",
                    indexed: true
                } as Helper.IFieldInfoChoice,
                {
                    name: "entityGM",
                    title: "Entity GM",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,

                /******** Workflow Pointer (Lookup to WorkflowRuns) ********/
                {
                    name: "currentRun",
                    title: "Current Workflow Run",
                    type: Helper.SPCfgFieldType.Lookup,
                    listName: Strings.Sites.main.lists.WorkflowRuns,
                    description: "Lookup to the current Run info/id",
                    showField: "ID",
                    multi: false,
                    indexed: true
                } as Helper.IFieldInfoLookup
            ],
            ViewInformation: [
                {
                    ViewName: "All Items",
                    Default: true,
                    ViewQuery: "<OrderBy><FieldRef Name=\"Created\" Ascending=\"FALSE\" /></OrderBy>",
                    ViewFields: [
                        "LinkTitle",
                        "projectName",
                        "contractType",
                        "riskStart",
                        "riskEnd",
                        "popEnd",
                        "entity",
                        "projectMgr",
                        "riskReason",
                        "riskFundingRequested",
                        "araStatus"
                    ]
                }
            ]
        },

        /********************************************************************
         * Workflow Runs (state machine instance per run)
         ********************************************************************/
        {
            ListInformation: {
                Title: Strings.Sites.main.lists.WorkflowRuns,
                Description: "ARA Workflow Runs - one row per workflow cycle per agreement",
                OnQuickLaunch: false,
                BaseTemplate: SPTypes.ListTemplateType.GenericList
            },
            TitleFieldRequired: false,
            TitleFieldUniqueValues: false,
            TitleFieldIndexed: false,
            CustomFields: [
                /******** Relationship ********/
                {
                    name: "agreement",
                    title: "Agreement",
                    type: Helper.SPCfgFieldType.Lookup,
                    listName: Strings.Sites.main.lists.Agreements,
                    showField: "ID",
                    multi: false,
                    indexed: true
                } as Helper.IFieldInfoLookup,
                {
                    name: "runNumber",
                    title: "Run Number",
                    type: Helper.SPCfgFieldType.Number,
                    min: 1,
                    decimals: 0,
                    defaultValue: "1",
                    indexed: true
                } as Helper.IFieldInfoNumber,
                {
                    name: "runStatus",
                    title: "Run Status",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Active", "Completed", "Superseded"],
                    defaultValue: "Active",
                    indexed: true
                } as Helper.IFieldInfoChoice,
                {
                    name: "started",
                    title: "Started",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime,
                    indexed: true
                } as Helper.IFieldInfoDate,
                {
                    name: "completed",
                    title: "Completed",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime,
                    indexed: true
                } as Helper.IFieldInfoDate,
                {
                    name: "hasDecision",
                    title: "Has Decision",
                    type: Helper.SPCfgFieldType.Boolean,
                    description: "Does this run have any decision made yet?",
                    defaultValue: "0"
                } as Helper.IFieldInfoDate,
                {
                    name: "outcome",
                    title: "Outcome",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Approved", "Rejected"]
                } as Helper.IFieldInfoChoice,
                /******** Mod / Restart metadata ********/
                {
                    name: "restartReason",
                    title: "Restart Reason",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Mod", "Correction", "Reopen", "Other"]
                } as Helper.IFieldInfoChoice,
                {
                    name: "restartComment",
                    title: "Restart Comment",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,
                {
                    name: "triggerAgreementVersion",
                    title: "Trigger Agreement Version",
                    type: Helper.SPCfgFieldType.Number,
                    min: 1
                } as Helper.IFieldInfoNumber,
                /******** Current / Pending state (source of truth) ********/
                {
                    name: "currentStepKey",
                    title: "Current Step Key",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["submit", "contractMgr", "ogPresident", "coo", "ceo", "svpContracts"],
                    defaultValue: "submit",
                    indexed: true
                } as Helper.IFieldInfoChoice,
                {
                    name: "pendingRole",
                    title: "Pending Role",
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "pendingApproverId",
                    title: "Pending Approver Id",
                    type: Helper.SPCfgFieldType.Number,
                    indexed: true,
                    min: 1
                } as Helper.IFieldInfoNumber,
                {
                    name: "pendingApproverEmail",
                    title: "Pending Approver Email",
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "stepAssignedDate",
                    title: "Step Assigned Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime,
                    indexed: true
                } as Helper.IFieldInfoDate,

                /******** Approver assignment snapshot (columns) ********/
                {
                    name: "contractMgr",
                    title: "Contract Manager",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "ogPresident",
                    title: "OG President",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "coo",
                    title: "COO",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "ceo",
                    title: "CEO",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser,
                {
                    name: "svpContracts",
                    title: "SVP Contracts",
                    type: Helper.SPCfgFieldType.User
                } as Helper.IFieldInfoUser
            ],
            ViewInformation: [
                {
                    ViewName: "Active Runs",
                    Default: true,
                    ViewQuery:
                        "<Where><Eq><FieldRef Name=\"runStatus\" /><Value Type=\"Choice\">Active</Value></Eq></Where>" +
                        "<OrderBy><FieldRef Name=\"Modified\" Ascending=\"FALSE\" /></OrderBy>",
                    ViewFields: [
                        "LinkTitle",
                        "agreement",
                        "runNumber",
                        "runStatus",
                        "currentStepKey",
                        "pendingRole",
                        "pendingApproverEmail",
                        "stepAssignedDate",
                        "started"
                    ]
                }
            ]
        },

        /********************************************************************
         * Workflow Actions (append-only history)
         ********************************************************************/
        {
            ListInformation: {
                Title: Strings.Sites.main.lists.WorkflowActions,
                Description: "ARA Workflow Actions - immutable action history per run",
                OnQuickLaunch: false,
                BaseTemplate: SPTypes.ListTemplateType.GenericList
            },
            TitleFieldRequired: false,
            TitleFieldUniqueValues: false,
            TitleFieldIndexed: false,
            TitleFieldDescription: "ARA Action",
            CustomFields: [
                /******** Relationships ********/
                {
                    name: "agreement",
                    title: "Agreement",
                    type: Helper.SPCfgFieldType.Lookup,
                    listName: Strings.Sites.main.lists.Agreements,
                    showField: "ID",
                    multi: false,
                    indexed: true
                } as Helper.IFieldInfoLookup,
                {
                    name: "run",
                    title: "Workflow Run",
                    type: Helper.SPCfgFieldType.Lookup,
                    listName: Strings.Sites.main.lists.WorkflowRuns,
                    showField: "Id",
                    multi: false,
                    indexed: true
                } as Helper.IFieldInfoLookup,

                /******** What happened ********/
                {
                    name: "stepKey",
                    title: "Step Key",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["submit", "contractMgr", "ogPresident", "coo", "ceo", "svpContracts"],
                    indexed: true,
                    defaultValue: "submit"
                } as Helper.IFieldInfoChoice,
                {
                    name: "actionType",
                    title: "Action Type",
                    type: Helper.SPCfgFieldType.Choice,
                    choices: ["Submitted", "Approved", "Rejected", "Comment", "Returned", "Reassigned", "Modified", "Restarted"],
                    indexed: true,
                    defaultValue: "Submitted"
                } as Helper.IFieldInfoChoice,

                {
                    name: "actor",
                    title: "Actor",
                    type: Helper.SPCfgFieldType.User,
                    indexed: true
                } as Helper.IFieldInfoUser,

                /******** Timing for reporting ********/
                {
                    name: "actionCompletedDate",
                    title: "Action Completed Date",
                    type: Helper.SPCfgFieldType.Date,
                    format: SPTypes.DateFormat.DateTime,
                    indexed: true
                } as Helper.IFieldInfoDate,

                {
                    name: "comment",
                    title: "Comment",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,

                /******** Optional mod/change fields ********/
                {
                    name: "changeSummary",
                    title: "Change Summary",
                    type: Helper.SPCfgFieldType.Text
                },
                {
                    name: "changePayloadJson",
                    title: "Change Payload (JSON)",
                    type: Helper.SPCfgFieldType.Note,
                    noteType: SPTypes.FieldNoteType.TextOnly
                } as Helper.IFieldInfoNote,

                {
                    name: "sequence",
                    title: "Sequence",
                    type: Helper.SPCfgFieldType.Number,
                    min: 0,
                    decimals: 0
                } as Helper.IFieldInfoNumber
            ],
            ViewInformation: [
                {
                    ViewName: "Recent Actions",
                    Default: true,
                    ViewQuery: "<OrderBy><FieldRef Name=\"actionCompletedDate\" Ascending=\"FALSE\" /></OrderBy>",
                    ViewFields: [
                        "LinkTitle",
                        "agreement",
                        "run",
                        "stepKey",
                        "actionType",
                        "actor",
                        "actionCompletedDate",
                        "comment",
                        "changeSummary"
                    ]
                }
            ]
        }
    ]
});
