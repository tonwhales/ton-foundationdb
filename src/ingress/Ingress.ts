import { Context, createContextNamespace } from "@openland/context";
import { TonClient } from "ton";
import { TonBlock } from "../types";

export type Ingress = {
    client: TonClient;
    ingressBlock: (seqno: number) => Promise<TonBlock>;
    ingressLastSeqno: () => Promise<number>;
};

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