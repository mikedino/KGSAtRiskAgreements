import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";
import { IPeoplePicker } from "../data/props";

export class EntityService {

    // Update the role for an existing App User list item
    static async updateGm(entityId: number, gm?: IPeoplePicker): Promise<void> {
        try {
            await Web().Lists(Strings.Sites.lookups.lists.Entities).Items().getById(entityId).update({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.Entities)}ListItem` },
                gmId: gm?.Id
            }).executeAndWait();
        } catch (err) {
            throw new Error(`Error updating user role: ${formatError(err)}`);
        }
    }

}