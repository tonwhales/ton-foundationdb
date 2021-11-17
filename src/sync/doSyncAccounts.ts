import { Context } from "@openland/context";
import { inTx } from "@openland/foundationdb";
import { Address } from "ton";
import { getIngress } from "../ingress/Ingress";
import { getStorage } from "../storage/types";
import { log } from "../utils";
import { applyAccounts } from "./applyAccount";

export async function doSyncAccounts(parent: Context) {
    const storage = getStorage(parent);
    const ingress = getIngress(parent);
    const allAccounts = await inTx(parent, async (ctx) => (await storage.accounts.range(ctx, [])).map((i) => i.key[0] as string));
    log('[accounts] Read ' + allAccounts.length + ' accounts');

    while (allAccounts.length > 0) {
        let accounts = allAccounts.splice(0, 100);
        let accountStates = await Promise.all(Array.from(accounts).map(async (account) => {
            const address = Address.parseFriendly(account).address;
            return { state: await ingress.ingressAccountState(address), address };
        }));
        await inTx(parent, async (ctx) => {
            await applyAccounts(ctx, accountStates);
        });
        log('[accounts] remaining: ' + allAccounts.length);
    }
}