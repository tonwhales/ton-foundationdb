import { Context, createContextNamespace } from "@openland/context";
import BN from "bn.js";
import { Address, TonClient } from "ton";
import { TonBlock } from "../types";

export type Ingress = {
    client: TonClient;
    ingressBlock: (seqno: number) => Promise<TonBlock>;
    ingressLastSeqno: () => Promise<number>;
    ingressAccountState: (address: Address) => Promise<AccountState>;
};

export type AccountState = {
    balance: BN;
    state: "active" | "uninitialized" | "frozen";
    code: Buffer | null;
    data: Buffer | null;
    lastTransaction: {
        lt: string;
        hash: string;
    } | null;
    blockId: {
        workchain: number;
        shard: string;
        seqno: number;
    };
    timestampt: number;
}

const ingressNamespace = createContextNamespace<Ingress | null>('ingress', null);

export function withIngress(src: Context, ingress: Ingress) {
    return ingressNamespace.set(src, ingress);
}

export function getIngress(ctx: Context) {
    let storage = ingressNamespace.get(ctx);
    if (!storage) {
        throw Error('No ingress');
    }
    return storage;
}