import DataLoader from "dataloader";
import { Address, TonTransaction } from "ton";
import { tonClient } from "..";

type TonShardDef = {
    workchain: number;
    shard: string;
    seqno: number;
};

export type TonShard = {
    workchain: number;
    shard: string;
    seqno: number;
    transactions: { address: Address, lt: string, hash: string }[];
}

export type TonBlock = {
    seqno: number;
    shards: TonShard[];
}

const shardsLoader = new DataLoader<number, TonShardDef[]>(async (src) => {
    return await Promise.all(src.map(async (seqno) => {
        return await tonClient.getWorkchainShards(seqno);
    }));
});

const shardLoader = new DataLoader<TonShardDef, TonShard, string>(async (src) => {
    return Promise.all(src.map(async (def) => {
        if (def.seqno > 0) {
            let tx = await tonClient.getShardTransactions(def.workchain, def.seqno, def.shard);
            let transactions = await Promise.all(tx.map(async (v) => ({ address: v.account, lt: v.lt, hash: v.hash })));
            return {
                workchain: def.workchain,
                seqno: def.seqno,
                shard: def.shard,
                transactions
            };
        } else {
            return {
                workchain: def.workchain,
                seqno: def.seqno,
                shard: def.shard,
                transactions: []
            };
        }
    }));
}, { cacheKeyFn: (src) => src.workchain + ':' + src.shard + ':' + src.seqno });

const blockLoader = new DataLoader<number, TonBlock>(async (src) => {
    return Promise.all(src.map(async (seqno) => {

        // Load shard defs
        let shardDefs = await shardsLoader.load(seqno);
        shardDefs = [{ workchain: -1, seqno, shard: '-9223372036854775808' }, ...shardDefs];

        // Load shards
        let shards = await Promise.all(shardDefs.map((shard) => {
            return shardLoader.load(shard);
        }));

        return {
            seqno,
            shards
        };
    }));
});

export function fetchBlock(seqno: number) {
    return blockLoader.load(seqno);
}