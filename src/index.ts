import { createNamedContext } from "@openland/context";
import { Database, inTx } from "@openland/foundationdb";
import { Address, TonClient } from 'ton';
import { fetchBlock } from "./ton/fetchBlock";

const root = createNamedContext('indexer');
export const tonClient = new TonClient({ endpoint: 'http://localhost:80/jsonRPC' });

(async () => {
    console.log('Opening database...');
    let db = await Database.open();
    let dirs = await inTx(root, async (ctx) => {
        let wallets = await db.directories.createOrOpen(ctx, ['ton', 'wallets']);
        let transactions = await db.directories.createOrOpen(ctx, ['ton', 'transactions']);
        return { wallets, transactions };
    });
    console.log('Fetching masterchain info...');
    let mcInfo = await tonClient.getMasterchainInfo();

    //
    // Address based worker
    //

    function startWalletWorker(address: Address) {
        console.log('Found new address: ' + address.toFriendly());
    }


    // Start fetching
    const foundAddresses = new Set<string>();
    for (let seq = 1; seq <= mcInfo.latestSeqno; seq++) {
        console.log('Fetching block #' + seq);
        let block = await fetchBlock(seq);
        for (let shard of block.shards) {
            for (let t of shard.transactions) {
                if (foundAddresses.has(t.address.toFriendly())) {
                    continue;
                }
                foundAddresses.add(t.address.toFriendly());
                startWalletWorker(t.address);
            }
        }
    }

    // const db = open();
    // db.doTn((tn) => {
    //     tn.dire
    // });
    // const client = new TonClient()
})();