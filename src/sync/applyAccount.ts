import { Context } from "@openland/context";
import { Address } from "ton";
import { AccountState } from "../ingress/Ingress";
import { bnCodec } from "../storage/bnCodec";
import { getStorage } from "../storage/types";

export async function applyAccounts(ctx: Context, accounts: { address: Address, state: AccountState }[]) {
    const storage = getStorage(ctx);
    for (let acc of accounts) {
        storage.accountBalances.set(ctx, [acc.address.toFriendly()], bnCodec.encode(acc.state.balance));
    }
}