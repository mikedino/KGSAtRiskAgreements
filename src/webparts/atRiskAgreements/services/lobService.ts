import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";

export class LobService {

    static async updateCoo(lobId: number, cooId?: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.lookups.lists.LOBs)
                .Items()
                .getById(lobId)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.LOBs)}ListItem` },
                    cooId: cooId ?? null
                })
                .execute(
                    () => resolve(),
                    (err) => reject(new Error(`Error updating COO in LOB list: ${formatError(err)}`))
                );
        });
    }

}