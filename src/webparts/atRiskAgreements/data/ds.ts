import { Web } from "gd-sprest";
import { WebPartContext } from '@microsoft/sp-webpart-base';
import Strings, { setContext } from "../../../strings";
import { IConfigItem, IContractItem, IEntitiesItem, IInvoiceItem, IOGPresidentsItem, IPeoplePicker, IRiskAgreementItem } from "./props";
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

            if (!this.initialized || override) { //ensure this was not already initialized and not manually being refreshed

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
                    .catch(error => {
                        console.error("Error initializing data", formatError(error));
                        reject(error);
                    });
            } else {
                resolve();
            }

        })

    }

    // Load all the Risk Agreeements
    private static _agreements: IRiskAgreementItem[] = [];
    private static _agreementsVersion = 0; // detect refreshes
    static get Agreements(): IRiskAgreementItem[] { return this._agreements; }
    static get AgreementsVersion(): number { return this._agreementsVersion; }
    private static setAgreements(items: IRiskAgreementItem[]): void {
        this._agreements = items;
        this._agreementsVersion++; // increment "version" (refresh)
    }

    static getAgreeements(): Promise<IRiskAgreementItem[]> {
        return new Promise<IRiskAgreementItem[]>((resolve, reject) => {

            // clear the items
            this._agreements = [];

            // load the data
            Web(Strings.Sites.main.url).Lists(Strings.Sites.main.lists.Agreements).Items().query({
                GetAllItems: true,
                OrderBy: ["Created"],
                Select: [
                    "*", "Author/Id", "Author/Title", "Author/EMail", "projectMgr/Id", "projectMgr/Title", "projectMgr/EMail",
                    "contractMgr/Id", "contractMgr/Title", "contractMgr/EMail", "entityGM/Id", "entityGM/Title", "entityGM/EMail",
                    "OGPresident/Id", "OGPresident/Title", "OGPresident/EMail", "SVPContracts/Id", "SVPContracts/Title", "SVPContracts/EMail",
                    "LOBPresident/Id", "LOBPresident/Title", "LOBPresident/EMail",
                    "CEO/Id", "CEO/Title", "CEO/EMail"
                ],
                Expand: ["Author", "projectMgr", "contractMgr", "entityGM", "OGPresident", "SVPContracts",
                    'LOBPresident',
                    'CEO'
                ],
                Filter: "araStatus ne 'Draft'",
                Top: 5000
            }).execute(
                // Success
                items => {
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
                error => {
                    reject(new Error(`Error fetching Agreements: ${formatError(error)}`));
                }
            )

        });
    }

    // Load default CEO and SVP Contract from Config list
    private static _config: IConfigItem[] = [];
    static get CEO(): IPeoplePicker | undefined {
        const ceo = this._config.find(c => c.IsFor === "CEO")?.User
        return ceo;
    }
    static get SVPContracts(): IPeoplePicker | undefined {
        const svpc = this._config.find(c => c.IsFor === "SVPContracts")?.User
        return svpc;
    }
    static getConfig(): Promise<IConfigItem[]> {
        return new Promise<IConfigItem[]>((resolve, reject) => {

            // clear the items
            this._config = [];

            // load the data
            Web(Strings.Sites.lookups.url).Lists(Strings.Sites.lookups.lists.Config).Items().query({
                Select: ["Id", "Title", "User/Id", "User/EMail", "User/Title", "IsFor"],
                Filter: `IsFor eq 'CEO' or IsFor eq 'SVPContracts'`,
                Expand: ["User"]
            }).execute(
                // Success
                items => {
                    if (items?.results?.length) {
                        this._config = items.results as unknown as IConfigItem[];

                        // resolve with retrieved items
                        resolve(this._config);

                    } else {
                        //none found - resolve with empty array
                        resolve([])
                    }
                },
                // Error
                error => {
                    reject(new Error(`Error fetching Config: ${formatError(error)}`));
                }
            )

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
            Web(Strings.Sites.lookups.url).Lists(Strings.Sites.lookups.lists.Entities).Items().query({
                GetAllItems: true,
                OrderBy: ["Title"],
                Select: ["Id", "Title", "abbr", "GM/EMail", "GM/Title", "GM/Id", "combinedTitle"],
                Expand: ["GM"],
                Top: 5000
            }).execute(
                // Success
                items => {
                    if (items?.results?.length) {
                        this._entities = items.results as unknown as IEntitiesItem[];

                        // resolve with retrieved items
                        resolve(this._entities);

                    } else {
                        //none found - resolve with empty array
                        resolve([])
                    }
                },
                // Error
                error => {
                    reject(new Error(`Error fetching Entities: ${formatError(error)}`));
                }
            )

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
            Web(Strings.Sites.lookups.url).Lists(Strings.Sites.lookups.lists.OGPresidents).Items().query({
                GetAllItems: true,
                OrderBy: ["Title"],
                Select: ["Id", "Title", "LOB", "president/EMail", "president/Title", "president/Id",
                    "LOBPresident/EMail", "LOBPresident/Title", "LOBPresident/Id", "CM/EMail", "CM/Title", "CM/Id"],
                Expand: ["president", "LOBPresident", "CM"],
                Top: 5000
            }).execute(
                // Success
                items => {
                    if (items?.results?.length) {
                        this._ogs = items.results as unknown as IOGPresidentsItem[];

                        // resolve with retrieved items
                        resolve(this._ogs);

                    } else {
                        //none found - resolve with empty array
                        resolve([])
                    }
                },
                // Error
                error => {
                    reject(new Error(`Error fetching Entities: ${formatError(error)}`));
                }
            )

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
            Web(Strings.Sites.jamis.url).Lists(Strings.Sites.jamis.lists.ContractEP).Items().query({
                GetAllItems: true,
                OrderBy: ["field_20"],
                Select: ["Id", "Title", "field_19", "field_20", "field_35", "field_21", 'field_23', 'field_75'],
                Filter: `field_16 ge datetime'${today.toISOString()}'`, //Completion Date in the future
                Top: 5000
            }).execute(
                // Success
                items => {
                    if (items?.results?.length) {
                        this._contracts = items.results as unknown as IContractItem[];

                        // resolve with retrieved items
                        resolve(this._contracts);

                    } else {
                        //none found - resolve with empty array
                        resolve([])
                    }
                },
                // Error
                error => {
                    reject(new Error(`Error fetching Contracts: ${formatError(error)}`));
                }
            )

        });
    }

    // Load all the Invoices from JAMIS
    // Currently there are 2700+ with no way to filter so this is loaded on on new/edit forms
    // look to filter if/when we get additional data in the JAMIS pull
    private static _invoices: IInvoiceItem[] = [];
    static get Invoices(): IInvoiceItem[] { return this._invoices; }
    // static getInvoices(): Promise<IInvoiceItem[]> {
    //     return new Promise<IInvoiceItem[]>((resolve, reject) => {

    //         // clear the items
    //         this._invoices = [];

    //         // get today's date
    //         // const today = new Date();
    //         // today.setHours(0, 0, 0, 0); //set time to midnight local time

    //         // load the data
    //         Web(Strings.Sites.jamis.url).Lists(Strings.Sites.jamis.lists.InvoiceEP).Items().query({
    //             GetAllItems: true,
    //             OrderBy: ["field_42"],
    //             Select: ["Id", "Title", "field_49", "field_28", "field_14", "InvoiceID1", "field_42"],
    //             //Filter: `field_62 ge datetime'${today.toISOString()}'`, //Last Bill Date in the future - field is NULL as of 12/24/25
    //             Top: 5000
    //         }).execute(
    //             // Success
    //             items => {
    //                 if (items?.results?.length) {
    //                     this._invoices = items.results as unknown as IInvoiceItem[];

    //                     // resolve with retrieved items
    //                     resolve(this._invoices);

    //                 } else {
    //                     //none found - resolve with empty array
    //                     resolve([])
    //                 }
    //             },
    //             // Error
    //             error => {
    //                 reject(new Error(`Error fetching Invoices: ${formatError(error)}`));
    //             }
    //         )

    //     });
    // }

    // only get invoices by contract on the form once contract is selected
    static getInvoicesByContract(contractId: string): Promise<IInvoiceItem[]> {
        return new Promise<IInvoiceItem[]>((resolve, reject) => {
            this._invoices = [];

            Web(Strings.Sites.jamis.url).Lists(Strings.Sites.jamis.lists.InvoiceEP).Items()
                .query({
                    GetAllItems: true,
                    OrderBy: ["field_42"],
                    Select: ["Id", "Title", "field_49", "field_28", "field_14", "InvoiceID1", "field_42"],
                    Filter: `field_49 eq '${contractId}'`,
                    Top: 5000
                })
                .execute((items) => {
                    this._invoices = (items?.results ?? []) as unknown as IInvoiceItem[];
                    resolve(this._invoices);
                },
                    (error) => reject(new Error(`Error fetching Invoices: ${formatError(error)}`))
                );
        });
    }
}