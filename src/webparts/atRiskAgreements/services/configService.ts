import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";
import { IPeoplePicker } from "../data/props";

export class ConfigService {

    static async updateApprover(configItemId: number, user?: IPeoplePicker): Promise<void> {
        try {
            await Web().Lists(Strings.Sites.lookups.lists.LOBs).Items().getById(configItemId).update({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.LOBs)}ListItem` },
                userId: user?.Id
            }).executeAndWait();
        } catch (err) {
            throw new Error(`Error updating config list approver: ${formatError(err)}`);
        }
    }

}