import { Context, createNamedContext } from "@openland/context";
import { inTx } from "@openland/foundationdb";
import { gql, ApolloServer } from "apollo-server";
import {
    ApolloServerPluginLandingPageGraphQLPlayground
} from "apollo-server-core";
import { BN } from "bn.js";
import { Address, fromNano } from "ton";
import { bnCodec } from "../storage/bnCodec";
import { Block } from "../storage/storage";
import { getStorage } from "../storage/types";
import { log } from "../utils";

const typeDefs = gql`
type Block {
  id: ID!
  seq: Int!
  shards: [Shard!]!
}

type Shard {
  id: ID!
  seq: Int!
  workchain: Int!
  shard: String!
  transactions: [Transaction!]!
}

type Transaction {
    id: ID!
    hash: String!
    lt: String!
    address: String!
}

type Account {
    id: ID!
    address: String!
    balance: String!
}

type Query {
  block(seq: Int): Block
  account(id: ID!): Account
  topAccounts: [Account!]!
}
`;

const root = createNamedContext('api');

export async function startApi(parent: Context) {

    const storage = getStorage(parent);

    const resolvers = {
        Block: {
            id: (src: any) => 'block:' + src.seq
        },
        Shard: {
            id: (src: any) => 'shard:' + src.workchain + ':' + src.shard + ':' + src.seq,
            transactions: async (src: any) => {
                return await inTx(root, async (ctx) => {
                    return (await storage.blockTransactions.range(ctx, [src.workchain, Buffer.from(src.shard, 'hex'), src.seq])).map((v) => ({
                        address: v.key[3],
                        lt: v.key[4],
                        hash: v.key[5]
                    }))
                });
            }
        },
        Account: {
            id: (src: any) => 'account:' + src.id,
            address: (src: any) => src.id
        },
        Transaction: {
            id: (src: any) => 'tx:' + src.hash
        },
        Query: {
            block: async (_: any, args: { seq: number | null | undefined }) => {
                return await inTx(root, async (ctx) => {

                    let seq: number;
                    if (typeof args.seq === 'number') {
                        seq = args.seq;
                    } else {
                        seq = (await storage.sync.get(ctx, ['masterchain_seqno'])) || 0;
                    }

                    let block = await storage.blocks.get(ctx, [seq]);
                    if (!block) {
                        throw Error('Unable to find block');
                    }
                    console.warn(new BN('-9223372036854775808').toString('hex'));

                    let blk = Block.fromBinary(block);
                    return {
                        seq: seq,
                        shards: [{
                            seq,
                            shard: Buffer.from(new BN('-9223372036854775808').toString('hex')).toString('hex'),
                            workchain: -1
                        }, ...blk.shards.map((shard) => ({
                            seq: shard.seqno,
                            shard: Buffer.from(shard.shard).toString('hex'),
                            workchain: shard.workchain
                        }))]
                    }
                });
            },
            account: async (_: any, args: { id: string }) => {
                return await inTx(root, async (ctx) => {
                    let ex = (await storage.accountBalances.get(ctx, [Address.parse(args.id).toFriendly()]));
                    if (ex) {
                        return { id: Address.parse(args.id).toFriendly(), balance: fromNano(bnCodec.decode(ex)) };
                    } else {
                        return { id: Address.parse(args.id).toFriendly(), balance: '0' }
                    }
                });
            },
            topAccounts: async () => {
                return await inTx(root, async (ctx) => {
                    let accs = await storage.accountBalances.range(ctx, []);
                    let prepared = accs.map((v) => ({ id: v.key[0] as string, balance: bnCodec.decode(v.value) }));
                    prepared.sort((a, b) => b.balance.cmp(a.balance));
                    return prepared.slice(0, 100).map((address) => ({ id: address.id, balance: fromNano(address.balance) }));
                });
            }
        }
    };

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        plugins: [ApolloServerPluginLandingPageGraphQLPlayground()]
    });

    server.listen(3000, '0.0.0.0').then(({ url }) => {
        log(`🚀  Server ready at ${url}`);
    });
}