import { Context } from "@openland/context";
import { delay } from "teslabot";
import { backoff, log } from "../utils";
import { doSync } from "./doSync";
import { doSyncAccounts } from "./doSyncAccounts";

export async function startSync(ctx: Context) {

    // Block indexing
    backoff(async () => {
        while (true) {
            log('Syncing...');
            let syncResult = await doSync(ctx);
            if (syncResult === 'updated') {
                log('Updated');
            } else {
                log('No updates');
                await delay(1000);
            }
        }
    });

    // Balances
    backoff(async () => {
        while (true) {
            await doSyncAccounts(ctx);
            await delay(50000);
        }
    });
}