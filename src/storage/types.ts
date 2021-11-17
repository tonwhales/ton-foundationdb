import { Context, createContextNamespace } from "@openland/context";
import { Subspace, TupleItem } from "@openland/foundationdb";

export type Storage = {
    accounts: Subspace<TupleItem[], any>;
    accountBalances: Subspace<TupleItem[], Buffer>;
    transactions: Subspace;
    blocks: Subspace<TupleItem[]>;
    blockTransactions: Subspace<TupleItem[]>;
    sync: Subspace<TupleItem[], number>;
    cache: Subspace<TupleItem[], string>;
}

const storageNamespace = createContextNamespace<Storage | null>('storage', null);

export function withStorage(src: Context, storage: Storage) {
    return storageNamespace.set(src, storage);
}

export function getStorage(ctx: Context) {
    let storage = storageNamespace.get(ctx);
    if (!storage) {
        throw Error('No storage');
    }
    return storage;
}