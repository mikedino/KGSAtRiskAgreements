import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";
import { IPeoplePicker } from "../data/props";

export class OgService {

    static async updateApprovers(ogId: number, president?: IPeoplePicker, cm?: IPeoplePicker, scm?: IPeoplePicker): Promise<void> {
        try {
            await Web().Lists(Strings.Sites.lookups.lists.OGs).Items().getById(ogId).update({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.OGs)}ListItem` },
                presidentId: president?.Id,
                cmId: cm?.Id,
                scmId: scm?.Id
            }).executeAndWait();
        } catch (err) {
            throw new Error(`Error updating OG approver: ${formatError(err)}`);
        }
    }

}