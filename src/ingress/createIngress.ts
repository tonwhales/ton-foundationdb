import { Subspace, TupleItem } from "@openland/foundationdb";
import BN from "bn.js";
import { Address } from "ton";
import { TonBlock } from "../types";
import { backoff } from "../utils";
import { createClient } from "./createClient";
import { Ingress } from "./Ingress";


export async function createIngress(args: { cache: Subspace<TupleItem[], string> }): Promise<Ingress> {

    const client = await createClient(args.cache);

    const ingressBlock = async (seqno: number): Promise<TonBlock> => {

        // Load shard defs
        let shardDefs = await backoff(() => client.getWorkchainShards(seqno));
        shardDefs = [{ workchain: -1, seqno, shard: '-9223372036854775808' }, ...shardDefs];

        // Load shards
        let shards = await Promise.all(shardDefs.map(async (def) => {
            if (def.seqno > 0) {
                let tx = await backoff(() => client.getShardTransactions(def.workchain, def.seqno, def.shard));
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

        return {
            seqno,
            shards
        };
    };

    const ingressAccountState = async (address: Address) => {
        return await client.getContractState(address);
    }

    const ingressLastSeqno = async () => {
        return (await client.getMasterchainInfo()).latestSeqno;
    };


    return {
        client,
        ingressBlock,
        ingressLastSeqno,
        ingressAccountState
    };
}