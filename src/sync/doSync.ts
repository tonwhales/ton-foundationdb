import { Context } from "@openland/context";
import { inTx } from "@openland/foundationdb";
import { getIngress } from "../ingress/Ingress";
import { getStorage } from "../storage/types";
import { log } from "../utils";
import { applyBlocks } from "./applyBlock";
import { applySeqno } from "./applySeqno";

// 
// Configuration
//

const CURRENT_VERSION = 5;
const MAXIMUM_INLINE = 10;
const MAX_STREAMING_SYNC = 10000;

export async function doSync(parent: Context): Promise<'updated' | 'no_updates'> {
    const storage = getStorage(parent);
    const ingress = getIngress(parent);

    // Loading seqno
    const lastSeqno = await ingress.ingressLastSeqno();

    // Loading current state
    let startFrom = await inTx(parent, async (ctx) => {
        let ex = (await storage.sync.get(ctx, ['blocks']));
        let version = (await storage.sync.get(ctx, ['version']));
        if (version !== CURRENT_VERSION) {
            storage.sync.set(ctx, ['blocks'], 1);
            storage.sync.set(ctx, ['version'], CURRENT_VERSION);
            return 1;
        }
        if (ex) {
            return ex + 1;
        } else {
            return 1;
        }
    });

    // Sanity check
    if (lastSeqno < startFrom - 1) {
        throw Error('Blockchain seqno is less than synced one. Stored: ' + startFrom + ', received: ' + lastSeqno);
    }
    if (lastSeqno === startFrom - 1) {
        return 'no_updates';
    }

    // Inline sync
    for (let seq = startFrom; seq <= lastSeqno; seq++) {
        log('Synching ' + seq);
        const block = await ingress.ingressBlock(seq);
        await inTx(parent, async (ctx) => {

            // Sync block
            await applyBlocks(ctx, [block]);

            // Apply maximum seqno
            applySeqno(ctx, seq);

            // Sync state
            storage.sync.set(ctx, ['blocks'], seq);
        });
    }

    return 'updated';
}