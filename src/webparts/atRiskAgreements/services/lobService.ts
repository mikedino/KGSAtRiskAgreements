import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";
import { IPeoplePicker } from "../data/props";

export class LobService {

    static async updateCoo(lobId: number, coo?: IPeoplePicker): Promise<void> {
        try {
            await Web().Lists(Strings.Sites.lookups.lists.LOBs).Items().getById(lobId).update({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.LOBs)}ListItem` },
                cooId: coo?.Id
            }).executeAndWait();
        } catch (err) {
            throw new Error(`Error updating LOB > COO: ${formatError(err)}`);
        }
    }

}