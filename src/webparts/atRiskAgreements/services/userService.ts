import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { IAppUserItem } from "../data/props";
import { encodeListName, formatError } from "./utils";
import { ContextInfo } from "gd-sprest";
import { DataSource } from "../data/ds";

export class AppUserService {

    private static readonly _visitSessionKey = "ara_visit_counted";

    static createNewUser(): Promise<IAppUserItem> {
        const now = new Date().toISOString();
        return new Promise<IAppUserItem>((resolve, reject) => {
            Web().Lists(Strings.Sites.main.lists.Users).Items().add({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Users)}ListItem` },
                userId: ContextInfo.userId,
                lastVisit: now,
                visitCount: 1
            }).execute(
                (item) => resolve(item as unknown as IAppUserItem),
                (error) => reject(new Error(`Error creating user row: ${formatError(error)}`))
            );
        })
    }

    // Update lastVisit always; increment count only once per browser session
    static async touchCurrentUser(userItemId: number): Promise<void> {
        const now = new Date().toISOString();

        const counted = sessionStorage.getItem(this._visitSessionKey) === "1";
        const shouldIncrement = !counted;

        await new Promise<void>((resolve, reject) => {
            const updatePayload: Record<string, unknown> = {
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Users)}ListItem` },
                lastVisit: now
            };

            if (shouldIncrement) {
                // If you need safe increment (avoid race), do it with validateUpdateListItem or read+update.
                // With 50–70 users this is fine, but concurrency can still happen with multi-tabs.
                updatePayload.visitCount = (DataSource.CurrentUser?.visitCount ?? 0) + 1;
            }

            Web().Lists(Strings.Sites.main.lists.Users).Items().getById(userItemId)
                .update(updatePayload)
                .execute(
                    () => {
                        if (shouldIncrement) sessionStorage.setItem(this._visitSessionKey, "1");
                        resolve();
                    },
                    (error) => reject(new Error(`Error updating lastVisit/visitCount: ${formatError(error)}`))
                );
        });
    }

    static async updateMyModePreference(mode: "dark" | "light"): Promise<void> {

        if (!DataSource.CurrentUser?.Id) throw new Error("Current user is not available");

        await Web().Lists(Strings.Sites.main.lists.Users).Items().getById(DataSource.CurrentUser.Id).update({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Users)}ListItem` },
                modePreference: mode
            }).executeAndWait();

        //keep local cache consistent
        await DataSource.getOrCreateCurrentUser();
            
    }

}