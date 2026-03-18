import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName, formatError } from "./utils";

export interface IOgPayload {
    Id: number;
    Title: string;
    presidentId: number | undefined;
    lobId: number | undefined;
    CMId: number | undefined;
}

export class OgService {

    static create(item: IOgPayload): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            Web()
                .Lists(Strings.Sites.lookups.lists.OGs)
                .Items()
                .add({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.OGs)}ListItem` },
                    Title: item.Title,
                    presidentId: item.presidentId,
                    lobId: item.lobId,
                    CMId: item.CMId
                })
                .execute(
                    () => resolve(),
                    (err) => reject(new Error(`Error creating OG: ${formatError(err)}`))
                );
        });
    }

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

    static async update(item: IOgPayload): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.lookups.lists.OGs)
                .Items()
                .getById(item.Id)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.lookups.lists.OGs)}ListItem` },
                    Title: item.Title,
                    presidentId: item.presidentId,
                    lobId: item.lobId,
                    CMId: item.CMId
                })
                .execute(
                    () => resolve(),
                    (err) => reject(new Error(`Error updating OG item: ${formatError(err)}`))
                );
        });
    }

    static delete(ogId: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.lookups.lists.OGs)
                .Items()
                .getById(ogId)
                .recycle()
                .execute(
                    () => resolve(),
                    (err) => reject(new Error(`Error deleting OG: ${formatError(err)}`))
                );
        });
    }

}