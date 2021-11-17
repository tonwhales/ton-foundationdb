import { Context, createNamedContext } from "@openland/context";
import { inTx } from "@openland/foundationdb";
import { gql, ApolloServer } from "apollo-server";
import {
    ApolloServerPluginLandingPageGraphQLPlayground
} from "apollo-server-core";
import { BN } from "bn.js";
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

type Query {
  block(seq: Int): Block
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