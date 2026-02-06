import { Web } from "gd-sprest";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import Strings, { setContext } from "../../../strings";
import {
    IConfigItem,
    IContractItem,
    IEntitiesItem,
    IInvoiceItem,
    IOGPresidentsItem,
    IPeoplePicker,
    IRiskAgreementItem,
    IWorkflowActionItem,
    IWorkflowRunItem
} from "./props";
import { formatError } from "../services/utils";

export class DataSource {
    // prevent this from being initialized twice
    static initialized: boolean = false;

    // Initializes the application
    public static init(override: boolean, context?: WebPartContext): PromiseLike<void> {
        return new Promise<void>((resolve, reject) => {
            // See if the page context exists
            if (context) {
                // Set the context
                setContext(context);
            }

            if (!this.initialized || override) {
                //ensure this was not already initialized and not manually being refreshed
                Promise.all([
                    this.getAgreeements(),
                    this.getConfig(),
                    this.getEntities(),
                    this.getOGs(),
                    this.getContracts()
                ])
                    .then(() => {
                        this.initialized = true;
                        resolve();
                    })
                    .catch((error) => {
                        console.error("Error initializing data", formatError(error));
                        reject(error);
                    });
            } else {
                resolve();
            }
        });
    }

    public static agreementSelectQuery: string[] = [
        "Id", "Title", "projectName", "contractId", "invoice", "contractType", "riskStart", "riskEnd", "popEnd",
        "entity", "riskReason", "riskFundingRequested", "riskJustification", "contractName", "programName",
        "araStatus", "Created", "Modified", "og", "hasSubcontract",
        "Author/Id", "Author/Title", "Author/EMail",
        "Editor/Id", "Editor/Title", "Editor/EMail",
        "projectMgr/Id", "projectMgr/Title", "projectMgr/EMail",
        "entityGM/Id", "entityGM/Title", "entityGM/EMail",
        "contractMgr/Id", "contractMgr/Title", "contractMgr/EMail",
        "currentRun/Id", "currentRun/Title"
    ];
    public static agreementExpandQuery: string[] = ["Author", "Editor", "projectMgr", "entityGM", "contractMgr", "currentRun"];
    // Load all the Risk Agreeements
    private static _agreements: IRiskAgreementItem[] = [];
    private static _agreementsVersion = 0; // detect refreshes
    static get Agreements(): IRiskAgreementItem[] { return this._agreements; }
    static get AgreementsVersion(): number { return this._agreementsVersion; }
    private static setAgreements(items: IRiskAgreementItem[]): void {
        this._agreements = items;
        this._agreementsVersion++; // increment "version" (refresh) for context
    }

    static getAgreeements(): Promise<IRiskAgreementItem[]> {
        return new Promise<IRiskAgreementItem[]>((resolve, reject) => {
            // clear the items
            this._agreements = [];

            // NOTE:
            // Workflow assignments + pending state are no longer stored on Agreements.
            // Agreements now only store a pointer to the active run via currentRunId.
            // Current/pending data will be loaded from ARAWorkflowRuns (separate methods).
            Web(Strings.Sites.main.url)
                .Lists(Strings.Sites.main.lists.Agreements)
                .Items()
                .query({
                    GetAllItems: true,
                    OrderBy: ["Created"],
                    Select: this.agreementSelectQuery,
                    Expand: this.agreementExpandQuery,
                    Filter: "araStatus ne 'Draft'",
                    Top: 5000
                })
                .execute(
                    // Success
                    (items) => {
                        if (items?.results?.length) {
                            DataSource.setAgreements(items.results as unknown as IRiskAgreementItem[]);
                            resolve(DataSource.Agreements);
                        } else {
                            //none found - resolve with empty array
                            DataSource.setAgreements([]);
                            resolve([]);
                        }
                    },
                    // Error
                    (error) => {
                        reject(new Error(`Error fetching Agreements: ${formatError(error)}`));
                    }
                );
        });
    }

    // get all of the WF runs by run ID's
    // set a re-usable $select and $expand query
    public static runSelectQuery: string[] = [
        "Id", "runNumber", "runStatus", "started", "completed", "outcome", "restartReason",
        "restartComment", "triggerAgreementVersion", "currentStepKey", "pendingRole", "hasDecision",
        "pendingApproverId", "pendingApproverEmail", "stepAssignedDate",
        "contractMgr/Id", "contractMgr/Title", "contractMgr/EMail",
        "ogPresident/Id", "ogPresident/Title", "ogPresident/EMail",
        "coo/Id", "coo/Title", "coo/EMail",
        "ceo/Id", "ceo/Title", "ceo/EMail",
        "svpContracts/Id", "svpContracts/Title", "svpContracts/EMail",
        "agreement/Id"
    ];
    public static runExpandQuery: string[] = ["contractMgr", "ogPresident", "coo", "ceo", "svpContracts", "agreement"];

    static getCurrentWorkflowRuns(): Promise<IWorkflowRunItem[]> {
        return new Promise<IWorkflowRunItem[]>((resolve, reject) => {

            Web().Lists(Strings.Sites.main.lists.WorkflowRuns).Items().query({
                Select: this.runSelectQuery,
                Expand: this.runExpandQuery,
                Filter: `runStatus ne 'Superseded'`,
                OrderBy: ["agreement/Id asc", "runNumber desc"],
                Top: 5000
            }).execute(
                (items) => resolve((items?.results ?? []) as unknown as IWorkflowRunItem[]),
                (error) => reject(new Error(`Error fetching Runs (non-superseded): ${formatError(error)}`))
            );
        });
    }

    static getWorkflowRunsByAgreement(agreementId: number): Promise<IWorkflowRunItem[]> {
        return new Promise<IWorkflowRunItem[]>((resolve, reject) => {

            // load the data
            Web().Lists(Strings.Sites.main.lists.WorkflowRuns).Items().query({
                Select: this.runSelectQuery,
                Filter: `agreement/Id eq ${agreementId}`,
                Expand: this.runExpandQuery,
                OrderBy: ["runNumber asc"],
                Top: 5000
            }).execute(
                (items) => resolve((items?.results ?? []) as unknown as IWorkflowRunItem[]),
                (error) => reject(new Error(`Error fetching all Runs for AgreementId: ${formatError(error)}`))
            )

        })
    }

    // get all of the WF actions by run ID's
    // static getWorkflowActionsByRunIds(runIds: number[]): Promise<IWorkflowActionItem[]> {
    //     return new Promise<IWorkflowActionItem[]>((resolve, reject) => {

    //         if (!runIds.length) {
    //             resolve([] as IWorkflowActionItem[]);
    //             return;
    //         }

    //         // create dynamic filter for all ID's
    //         const filter = runIds.map(id => `run/Id eq ${id}`).join(' or ');

    //         // load the data
    //         Web().Lists(Strings.Sites.main.lists.WorkflowActions).Items().query({
    //             Select: [
    //                 "Id", "stepKey", "actionType", "actionCompletedDate", "comment", "changeSummary",
    //                 "changePayloadJson", "sequence",
    //                 "actor/Id", "actor/Title", "actor/EMail",
    //                 "agreement/Id", "run/Id"
    //             ],
    //             Filter: filter,
    //             Expand: ["actor", "agreement", "run"],
    //             OrderBy: ["Id asc"],
    //             Top: 5000
    //         }).execute(
    //             // Success
    //             (items) => {
    //                 if (items?.results?.length) {
    //                     const actions = items.results as unknown as IWorkflowActionItem[];

    //                     // resolve with retrieved items
    //                     resolve(actions);
    //                 } else {
    //                     //none found - resolve with empty array
    //                     resolve([]);
    //                 }
    //             },
    //             // Error
    //             (error) => {
    //                 reject(new Error(`Error fetching Actions by Run ID: ${formatError(error)}`));
    //             }
    //         )
    //     })
    // }

    // set a re-usable $select query for Actions
    private static actionsSelectQuery: string[] = [
        "Id", "stepKey", "actionType", "actionCompletedDate", "comment", "changeSummary", "sequence",
        "actor/Id", "actor/Title", "actor/EMail", "agreement/Id", "run/Id"
    ];
    private static actionsExpandQuery: string[] = ["actor", "agreement", "run"];
    // get all of the WF actions by ONE agreement - should be used on forms only
    static getWorkflowActionsByAgreement(agreementId: number): Promise<IWorkflowActionItem[]> {
        return new Promise<IWorkflowActionItem[]>((resolve, reject) => {

            Web().Lists(Strings.Sites.main.lists.WorkflowActions).Items().query({
                Select: this.actionsSelectQuery.concat("changePayloadJson"),
                Expand: this.actionsExpandQuery,
                Filter: `agreement/Id eq ${agreementId}`,
                OrderBy: ["actionCompletedDate desc", "Id desc"],
                Top: 5000
            }).execute(
                (items) => resolve((items?.results ?? []) as unknown as IWorkflowActionItem[]),
                (error) => reject(new Error(`Error fetching Actions by AgreementId: ${formatError(error)}`))
            );
        });
    }

    // get all of the WF actions by ME - use on MyWork
    static getMyWorkflowActions(actorId: number, sinceIso?: string): Promise<IWorkflowActionItem[]> {
        return new Promise<IWorkflowActionItem[]>((resolve, reject) => {

            if (!actorId || actorId <= 0) {
                resolve([]);
                return;
            }

            const sinceFilter = sinceIso ? ` and actionCompletedDate ge datetime'${sinceIso}'` : "";

            // If actionCompletedDate is DateTime, the datetime'...' syntax is correct for classic OData.
            // If it errors, we’ll switch to just: actionCompletedDate ge '${sinceIso}'
            const filter = `actor/Id eq ${actorId}${sinceFilter}`;

            Web().Lists(Strings.Sites.main.lists.WorkflowActions).Items().query({
                Select: this.actionsSelectQuery,
                Expand: this.actionsExpandQuery,
                Filter: filter,
                OrderBy: ["actionCompletedDate desc", "Id desc"],
                Top: 5000
            }).execute(
                (items) => resolve((items?.results ?? []) as unknown as IWorkflowActionItem[]),
                (error) => reject(new Error(`Error fetching My Actions: ${formatError(error)}`))
            );
        });
    }

    // get all of the WF actions by date range - can use on Dashboard later
    static getWorkflowActionsByDateRange(startIso: string, endIso: string): Promise<IWorkflowActionItem[]> {
        return new Promise<IWorkflowActionItem[]>((resolve, reject) => {

            const filter =
                `actionCompletedDate ge datetime'${startIso}' and actionCompletedDate lt datetime'${endIso}'`;

            Web().Lists(Strings.Sites.main.lists.WorkflowActions).Items().query({
                Select: this.actionsSelectQuery,
                Expand: this.actionsExpandQuery,
                Filter: filter,
                OrderBy: ["actionCompletedDate desc", "Id desc"],
                Top: 5000
            }).execute(
                (items) => resolve((items?.results ?? []) as unknown as IWorkflowActionItem[]),
                (error) => reject(new Error(`Error fetching Actions by Date Range: ${formatError(error)}`))
            );
        });
    }

    // Load default CEO and SVP Contract from Config list
    private static _config: IConfigItem[] = [];
    static get CEO(): IPeoplePicker | undefined {
        const ceo = this._config.find((c) => c.IsFor === "CEO")?.User;
        return ceo;
    }
    static get SVPContracts(): IPeoplePicker | undefined {
        const svpc = this._config.find((c) => c.IsFor === "SVPContracts")?.User;
        return svpc;
    }
    static getConfig(): Promise<IConfigItem[]> {
        return new Promise<IConfigItem[]>((resolve, reject) => {
            // clear the items
            this._config = [];

            // load the data
            Web(Strings.Sites.lookups.url)
                .Lists(Strings.Sites.lookups.lists.Config)
                .Items()
                .query({
                    Select: ["Id", "Title", "User/Id", "User/EMail", "User/Title", "IsFor"],
                    Filter: `IsFor eq 'CEO' or IsFor eq 'SVPContracts'`,
                    Expand: ["User"]
                })
                .execute(
                    // Success
                    (items) => {
                        if (items?.results?.length) {
                            this._config = items.results as unknown as IConfigItem[];

                            // resolve with retrieved items
                            resolve(this._config);
                        } else {
                            //none found - resolve with empty array
                            resolve([]);
                        }
                    },
                    // Error
                    (error) => {
                        reject(new Error(`Error fetching Config: ${formatError(error)}`));
                    }
                );
        });
    }

    // Load all the Entities
    private static _entities: IEntitiesItem[] = [];
    static get Entities(): IEntitiesItem[] { return this._entities; }
    static getEntities(): Promise<IEntitiesItem[]> {
        return new Promise<IEntitiesItem[]>((resolve, reject) => {
            // clear the items
            this._entities = [];

            // load the data
            Web(Strings.Sites.lookups.url)
                .Lists(Strings.Sites.lookups.lists.Entities)
                .Items()
                .query({
                    GetAllItems: true,
                    OrderBy: ["Title"],
                    Select: ["Id", "Title", "abbr", "GM/EMail", "GM/Title", "GM/Id", "combinedTitle"],
                    Expand: ["GM"],
                    Top: 5000
                })
                .execute(
                    // Success
                    (items) => {
                        if (items?.results?.length) {
                            this._entities = items.results as unknown as IEntitiesItem[];

                            // resolve with retrieved items
                            resolve(this._entities);
                        } else {
                            //none found - resolve with empty array
                            resolve([]);
                        }
                    },
                    // Error
                    (error) => {
                        reject(new Error(`Error fetching Entities: ${formatError(error)}`));
                    }
                );
        });
    }

    // Load all the OG's
    private static _ogs: IOGPresidentsItem[] = [];
    static get OGs(): IOGPresidentsItem[] { return this._ogs; }
    static getOGs(): Promise<IOGPresidentsItem[]> {
        return new Promise<IOGPresidentsItem[]>((resolve, reject) => {
            // clear the items
            this._ogs = [];

            // load the data
            Web(Strings.Sites.lookups.url)
                .Lists(Strings.Sites.lookups.lists.OGPresidents)
                .Items()
                .query({
                    GetAllItems: true,
                    OrderBy: ["Title"],
                    Select: [
                        "Id", "Title", "LOB",
                        "president/EMail", "president/Title", "president/Id",
                        "coo/EMail", "coo/Title", "coo/Id",
                        "CM/EMail", "CM/Title", "CM/Id"
                    ],
                    Expand: ["president", "coo", "CM"],
                    Top: 5000
                })
                .execute(
                    // Success
                    (items) => {
                        if (items?.results?.length) {
                            this._ogs = items.results as unknown as IOGPresidentsItem[];

                            // resolve with retrieved items
                            resolve(this._ogs);
                        } else {
                            //none found - resolve with empty array
                            resolve([]);
                        }
                    },
                    // Error
                    (error) => {
                        reject(new Error(`Error fetching OG Presidents: ${formatError(error)}`));
                    }
                );
        });
    }

    // Load all the Contracts from JAMIS
    private static _contracts: IContractItem[] = [];
    static get Contracts(): IContractItem[] { return this._contracts; }
    static getContracts(): Promise<IContractItem[]> {
        return new Promise<IContractItem[]>((resolve, reject) => {
            // clear the items
            this._contracts = [];

            // get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0); //set time to midnight local time

            // load the data
            Web(Strings.Sites.jamis.url)
                .Lists(Strings.Sites.jamis.lists.ContractEP)
                .Items()
                .query({
                    GetAllItems: true,
                    OrderBy: ["field_20"],
                    Select: ["Id", "Title", "field_19", "field_20", "field_35", "field_21", "field_23", "field_75"],
                    Filter: `field_16 ge datetime'${today.toISOString()}'`, //Completion Date in the future
                    Top: 5000
                })
                .execute(
                    // Success
                    (items) => {
                        if (items?.results?.length) {
                            this._contracts = items.results as unknown as IContractItem[];

                            // resolve with retrieved items
                            resolve(this._contracts);
                        } else {
                            //none found - resolve with empty array
                            resolve([]);
                        }
                    },
                    // Error
                    (error) => {
                        reject(new Error(`Error fetching Contracts: ${formatError(error)}`));
                    }
                );
        });
    }

    // Load all the Invoices from JAMIS
    // Currently there are 2700+ so this is loaded on on new/edit forms
    // but only get invoices by contract on the form once contract is selected
    private static _invoices: IInvoiceItem[] = [];
    static get Invoices(): IInvoiceItem[] { return this._invoices; }
    static getInvoicesByContract(contractId: string): Promise<IInvoiceItem[]> {
        return new Promise<IInvoiceItem[]>((resolve, reject) => {
            this._invoices = [];

            Web(Strings.Sites.jamis.url)
                .Lists(Strings.Sites.jamis.lists.InvoiceEP)
                .Items()
                .query({
                    GetAllItems: true,
                    OrderBy: ["field_42"],
                    Select: ["Id", "Title", "field_49", "field_28", "field_14", "InvoiceID1", "field_42"],
                    Filter: `field_49 eq '${contractId}'`,
                    Top: 5000
                })
                .execute(
                    (items) => {
                        this._invoices = (items?.results ?? []) as unknown as IInvoiceItem[];
                        resolve(this._invoices);
                    },
                    (error) => reject(new Error(`Error fetching Invoices: ${formatError(error)}`))
                );
        });
    }

    // static async getAgreementById(id: number): Promise<IRiskAgreementItem> {

    //     try {
    //         const ara = await Web().Lists(Strings.Sites.main.lists.Agreements).Items(id).query({
    //             Select: [
    //                 "*", "Author/Id", "Author/Title", "Author/EMail", "projectMgr/Id", "projectMgr/Title", "projectMgr/EMail",
    //                 "contractMgr/Id", "contractMgr/Title", "contractMgr/EMail", "entityGM/Id", "entityGM/Title", "entityGM/EMail",
    //                 "OGPresident/Id", "OGPresident/Title", "OGPresident/EMail", "SVPContracts/Id", "SVPContracts/Title", "SVPContracts/EMail",
    //                 "coo/Id", "coo/Title", "coo/EMail",
    //                 "CEO/Id", "CEO/Title", "CEO/EMail"
    //             ],
    //             Expand: ["Author", "projectMgr", "contractMgr", "entityGM", "OGPresident", "SVPContracts",
    //                 'coo',
    //                 'CEO'
    //             ]
    //         }).executeAndWait()

    //         return ara as unknown as IRiskAgreementItem

    //     } catch (error) {
    //         const err = formatError(error);
    //         console.error("Error fetching Agreement item updates: ", error);
    //         throw new Error(`Error fetching Agreement: ${err}`);
    //     }

    // }

}
