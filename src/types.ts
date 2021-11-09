import { Address } from "ton"

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