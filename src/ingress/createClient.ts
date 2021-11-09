import { createNamedContext } from "@openland/context";
import { inTx, Subspace, TupleItem } from "@openland/foundationdb";
import { TonClient } from "ton";

export async function createClient(cache: Subspace<TupleItem[], string>) {
    const root = createNamedContext('ton-client');
    return new TonClient({
        endpoint: 'http://localhost:80/jsonRPC',
        cache: {
            get: (namespace, key) => {
                return inTx(root, async (ctx) => {
                    let all = await cache.range(ctx, [namespace, key]);
                    if (all.length === 0) {
                        return null;
                    }
                    return all.map((v) => v.value).join('');
                })
            },
            set: async (namespace, key, value) => {
                await inTx(root, async (ctx) => {
                    if (value) {

                        // Split into parts
                        let parts: string[] = [];
                        let w = value;
                        while (w.length > 100_000) {
                            let part = w.slice(0, 100_000);
                            parts.push(part);
                            w = w.slice(100_000);
                        }
                        if (w.length > 0) {
                            parts.push(w);
                        }
                        if (parts.length === 0) {
                            parts.push('');
                        }

                        if (parts.length === 1) {
                            cache.set(ctx, [namespace, key], value);
                        } else {
                            cache.clear(ctx, [namespace, key]);
                            for (let i = 0; i < parts.length; i++) {
                                cache.set(ctx, [namespace, key, i], parts[i]);
                            }
                        }
                    } else {
                        cache.clear(ctx, [namespace, key]);
                    }
                });
            }
        }
    });
}