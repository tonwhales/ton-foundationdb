import { Context } from "@openland/context";
import { Database, encoders, inTx } from "@openland/foundationdb";
import { Storage } from "./types";

export async function createStorage(root: Context, db: Database): Promise<Storage> {
    let storage = await inTx(root, async (ctx) => {

        // Accounts state
        let accounts = (await db.directories.createOrOpen(ctx, ['ton', 'accounts']))
            .withKeyEncoding(encoders.tuple)
            .withValueEncoding(encoders.json);

        // Blocks list
        let blocks = (await db.directories.createOrOpen(ctx, ['ton', 'blocks']))
            .withKeyEncoding(encoders.tuple);

        let blockTransactions = (await db.directories.createOrOpen(ctx, ['ton', 'blocks', 'tx']))
            .withKeyEncoding(encoders.tuple);

        // Transactions (just reference)
        let transactions = await db.directories.createOrOpen(ctx, ['ton', 'transactions']);

        // Critical state
        let sync = (await db.directories.createOrOpen(ctx, ['ton', 'sync']))
            .withKeyEncoding(encoders.tuple)
            .withValueEncoding(encoders.int32LE);

        // Raw ingress cache
        let cache = (await db.directories.createOrOpen(ctx, ['ton', 'cache']))
            .withKeyEncoding(encoders.tuple)
            .withValueEncoding(encoders.string);

        return { accounts, transactions, blocks, blockTransactions, sync, cache };
    });
    return storage;
}