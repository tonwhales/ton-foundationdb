import { createNamedContext } from "@openland/context";
import { Database, inTx } from "@openland/foundationdb";
import { createBackoff, Queue } from "teslabot";
import BN from "bn.js";
import { Address, TonClient } from 'ton';
import { createStorage } from "./storage/createStorage";
import { createIngress } from "./ingress/createIngress";
import { log } from "./utils";
import { withStorage } from "./storage/types";
import { withIngress } from "./ingress/Ingress";
import { startSync } from "./sync/startSync";

const root = createNamedContext('main');

(async () => {

    log('Configuring server...');
    let db = await Database.open();
    let storage = await createStorage(root, db);
    let ingress = await createIngress({ cache: storage.cache });
    let ctx = root;
    ctx = withStorage(ctx, storage);
    ctx = withIngress(ctx, ingress);

    log('Starting sync...');
    await startSync(ctx);

    // log('Fetching masterchain info...');
    // let latestSeqno = await ingress.ingressLastSeqno();

    // //
    // // Process blocks
    // //

    // async function processBlock(blocks: TonBlock[], lastSeq: number) {
    //     await inTx(root, async (ctx) => {


    //         let addressState = new Map<string, {
    //             min: { lt: BN, hash: string, seq: number },
    //             max: { lt: BN, hash: string, seq: number }
    //         }>();

    //         // Fetch account transaction min/max
    //         for (let b of blocks) {
    //             for (let shard of b.shards) {
    //                 for (let tx of shard.transactions) {
    //                     let address = tx.address.toFriendly();
    //                     let lt = new BN(tx.lt);
    //                     let hash = tx.hash;
    //                     // Update address
    //                     if (!addressState.has(address)) {
    //                         addressState.set(address, {
    //                             min: { lt, hash, seq: b.seqno },
    //                             max: { lt, hash, seq: b.seqno }
    //                         });
    //                     } else {
    //                         let ex = addressState.get(address)!;
    //                         if (ex.min.lt.gt(lt)) {
    //                             ex.min.lt = lt;
    //                             ex.min.hash = hash;
    //                             ex.min.seq = b.seqno;
    //                         }
    //                         if (ex.max.lt.lt(lt)) {
    //                             ex.max.lt = lt;
    //                             ex.max.hash = hash;
    //                             ex.max.seq = b.seqno;
    //                         }
    //                     }
    //                 }
    //             }
    //         }

    //         // Apply accounts
    //         for (let acc of addressState) {

    //             // Fetch
    //             let existing = await storage.accounts.get(ctx, [acc[0]]) as {
    //                 min: { lt: string, hash: string, seq: number },
    //                 max: { lt: string, hash: string, seq: number }
    //             };

    //             // Update
    //             if (!existing) {
    //                 existing = {
    //                     min: { lt: acc[1].min.lt.toString(), hash: acc[1].min.hash, seq: acc[1].min.seq },
    //                     max: { lt: acc[1].max.lt.toString(), hash: acc[1].max.hash, seq: acc[1].max.seq }
    //                 };
    //             } else {
    //                 let minLt = new BN(existing.min.lt);
    //                 let maxLt = new BN(existing.max.lt);
    //                 if (minLt.gt(acc[1].min.lt)) {
    //                     existing.min = { lt: acc[1].min.lt.toString(), hash: acc[1].min.hash, seq: acc[1].min.seq };
    //                 }
    //                 if (maxLt.gt(acc[1].max.lt)) {
    //                     existing.max = { lt: acc[1].max.lt.toString(), hash: acc[1].max.hash, seq: acc[1].max.seq };
    //                 }
    //             }

    //             // Persist
    //             storage.accounts.set(ctx, [acc[0]], existing);
    //         }

    //         // Persist sync
    //         storage.sync.set(ctx, ['blocks'], lastSeq);
    //     });
    // }

    // const CURRENT_VERSION = 3;
    // let startFrom = await inTx(root, async (ctx) => {
    //     let ex = (await storage.sync.get(ctx, ['blocks']));
    //     let version = (await storage.sync.get(ctx, ['version']));
    //     if (version !== CURRENT_VERSION) {
    //         storage.sync.set(ctx, ['blocks'], 1);
    //         storage.sync.set(ctx, ['version'], CURRENT_VERSION);
    //         return 1;
    //     }
    //     if (ex) {
    //         return ex + 1;
    //     } else {
    //         return 1;
    //     }
    // });


    // // Start fetching
    // const blockQueue = new Queue<TonBlock>();

    // // Fetching
    // (async () => {
    //     const BATCH_SIZE = 20;
    //     for (let ss = startFrom; ss <= latestSeqno; ss += BATCH_SIZE) {
    //         let ids: number[] = [];
    //         for (let s = ss; s <= latestSeqno && s - ss < BATCH_SIZE; s++) {
    //             ids.push(s);
    //         }
    //         console.log('Fetching block #' + ss + ' - ' + (ss + ids.length - 1));
    //         const blocks = await Promise.all(ids.map(async (seq) => {
    //             return await ingress.ingressBlock(seq);
    //         }));
    //         for (let b of blocks) {
    //             blockQueue.push(b);
    //         }
    //     }
    // })();

    // // Processing
    // while (true) {
    //     let block = await blockQueue.get();
    //     console.log('Processing block #' + block.seqno);
    //     await processBlock([block], block.seqno);
    // }
})();