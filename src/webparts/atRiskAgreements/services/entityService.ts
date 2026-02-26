import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";


export class EntityService {

    // Update the role for an existing App User list item
    static async updateGm(entityId: number, gmId?: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.lookups.lists.Entities)
                .Items()
                .getById(entityId)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.Entities)}ListItem` },
                    GMId: gmId ?? null
                })
                .execute(
                    () => resolve(),
                    (err) => reject(new Error(`Error updating GM in Entity list: ${formatError(err)}`))
                );
        });
    }

}