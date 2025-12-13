import { Web } from "gd-sprest";
import { WebPartContext } from '@microsoft/sp-webpart-base';
import Strings, { setContext } from "../../../strings";
import { IRiskAgreementItem } from "./props";
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

                this.getAgreeements()
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
    static get Agreements(): IRiskAgreementItem[] { return this._agreements; }
    static getAgreeements(): Promise<IRiskAgreementItem[]> {
        return new Promise<IRiskAgreementItem[]>((resolve, reject) => {

            // clear the items
            this._agreements = [];

            // load the data
            Web(Strings.Sites.main.url).Lists(Strings.Sites.main.lists.Agreements).Items().query({
                GetAllItems: true,
                OrderBy: ["Created"],
                Select: ["*"],
                //Expand: ["leads", "poc"],
                Top: 5000
            }).execute(
                // Success
                items => {
                    if (items && items.results && Array.isArray(items.results)) {
                        this._agreements = items.results as unknown as IRiskAgreementItem[];

                        // resolve with retrieved items
                        resolve(this._agreements);

                    } else {
                        //none found - resolve with empty array
                        resolve([])
                    }
                },
                // Error
                error => {
                    reject(new Error(`Error fetching Agreements: ${formatError(error)}`));
                }
            )

        });
    }
}