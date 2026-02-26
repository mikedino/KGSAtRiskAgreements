import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";

export class OgService {

    static async updateApprovers(ogId: number, presidentId?: number, cmId?: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.lookups.lists.OGs)
                .Items()
                .getById(ogId)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.OGs)}ListItem` },
                    presidentId: presidentId ?? null,
                    CMId: cmId ?? null
                })
                .execute(
                    () => resolve(),
                    (err) => reject(new Error(`Error updating approver in OG list: ${formatError(err)}`))
                );
        });
    }

}