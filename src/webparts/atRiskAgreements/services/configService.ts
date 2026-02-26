import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";

export class ConfigService {

    static updateApprover(configItemId: number, userId?: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.lookups.lists.Config)
                .Items()
                .getById(configItemId)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.Config)}ListItem` },
                    UserId: userId ?? null
                })
                .execute(
                    () => resolve(),
                    (err) => reject(new Error(`Error updating Config list approver: ${formatError(err)}`))
                );
        });
    }

}