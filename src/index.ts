import { createNamedContext } from "@openland/context";
import { Database, encoders, inTx } from "@openland/foundationdb";
import BN, { min } from "bn.js";
import { dir } from "console";
import { Address, TonClient } from 'ton';
import { fetchBlock, TonBlock } from "./ton/fetchBlock";

const root = createNamedContext('indexer');
export const tonClient = new TonClient({ endpoint: 'http://localhost:80/jsonRPC' });

(async () => {
    console.log('Opening database...');
    let db = await Database.open();
    let dirs = await inTx(root, async (ctx) => {
        let accounts = (await db.directories.createOrOpen(ctx, ['ton', 'accounts']))
            .withKeyEncoding(encoders.tuple)
            .withValueEncoding(encoders.json);
        let transactions = await db.directories.createOrOpen(ctx, ['ton', 'transactions']);
        let blocks = await db.directories.createOrOpen(ctx, ['ton', 'blocks']);
        let sync = (await db.directories.createOrOpen(ctx, ['ton', 'sync']))
            .withKeyEncoding(encoders.tuple)
            .withValueEncoding(encoders.int32LE);
        return { accounts, transactions, blocks, sync };
    });
    console.log('Fetching masterchain info...');
    let mcInfo = await tonClient.getMasterchainInfo();

    //
    // Process blocks
    //

    async function processBlock(blocks: TonBlock[], lastSeq: number) {
        await inTx(root, async (ctx) => {


            let addressState = new Map<string, {
                min: { lt: BN, hash: string, seq: number },
                max: { lt: BN, hash: string, seq: number }
            }>();

            // Fetch account transaction min/max
            for (let b of blocks) {
                for (let shard of b.shards) {
                    for (let tx of shard.transactions) {
                        let address = tx.address.toFriendly();
                        let lt = new BN(tx.lt);
                        let hash = tx.hash;
                        // Update address
                        if (!addressState.has(address)) {
                            addressState.set(address, {
                                min: { lt, hash, seq: b.seqno },
                                max: { lt, hash, seq: b.seqno }
                            });
                        } else {
                            let ex = addressState.get(address)!;
                            if (ex.min.lt.gt(lt)) {
                                ex.min.lt = lt;
                                ex.min.hash = hash;
                                ex.min.seq = b.seqno;
                            }
                            if (ex.max.lt.lt(lt)) {
                                ex.max.lt = lt;
                                ex.max.hash = hash;
                                ex.max.seq = b.seqno;
                            }
                        }
                    }
                }
            }

            // Apply accounts
            for (let acc of addressState) {

                // Fetch
                let existing = await dirs.accounts.get(ctx, [acc[0]]) as {
                    min: { lt: string, hash: string, seq: number },
                    max: { lt: string, hash: string, seq: number }
                };

                // Update
                if (!existing) {
                    existing = {
                        min: { lt: acc[1].min.lt.toString(), hash: acc[1].min.hash, seq: acc[1].min.seq },
                        max: { lt: acc[1].max.lt.toString(), hash: acc[1].max.hash, seq: acc[1].max.seq }
                    };
                } else {
                    let minLt = new BN(existing.min.lt);
                    let maxLt = new BN(existing.max.lt);
                    if (minLt.gt(acc[1].min.lt)) {
                        existing.min = { lt: acc[1].min.lt.toString(), hash: acc[1].min.hash, seq: acc[1].min.seq };
                    }
                    if (maxLt.gt(acc[1].max.lt)) {
                        existing.max = { lt: acc[1].max.lt.toString(), hash: acc[1].max.hash, seq: acc[1].max.seq };
                    }
                }

                // Persist
                dirs.accounts.set(ctx, [acc[0]], existing);
            }

            // Persist sync
            dirs.sync.set(ctx, ['blocks'], lastSeq);
        });
    }

    let startFrom = await inTx(root, async (ctx) => {
        let ex = (await dirs.sync.get(ctx, ['blocks']));
        if (ex) {
            return ex + 1;
        } else {
            return 1;
        }
    });

    // Start fetching
    const BATCH_SIZE = 100;
    for (let ss = startFrom; ss <= mcInfo.latestSeqno; ss += BATCH_SIZE) {
        let ids: number[] = [];
        for (let s = ss; s <= mcInfo.latestSeqno && s - ss < BATCH_SIZE; s++) {
            ids.push(s);
        }
        console.log('Fetching block #' + ss + ' - ' + (ss + ids.length));
        const blocks = await Promise.all(ids.map(async (seq) => {
            return await fetchBlock(seq);
        }));

        // Apply
        await processBlock(blocks, ids[ids.length - 1]);
    }
})();