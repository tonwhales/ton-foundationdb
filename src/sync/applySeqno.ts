import { Context } from "@openland/context";
import { getStorage } from "../storage/types";

export function applySeqno(ctx: Context, seqno: number) {
    const storage = getStorage(ctx);
    storage.sync.max(ctx, ['masterchain_seqno'], seqno);
}