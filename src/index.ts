import { createNamedContext } from "@openland/context";
import { Database } from "@openland/foundationdb";
import { createStorage } from "./storage/createStorage";
import { createIngress } from "./ingress/createIngress";
import { log } from "./utils";
import { withStorage } from "./storage/types";
import { withIngress } from "./ingress/Ingress";
import { startSync } from "./sync/startSync";
import { startApi } from "./api/startApi";

const root = createNamedContext('main');

(async () => {

    log('Configuring server...');
    let db = await Database.open();
    let storage = await createStorage(root, db);
    let ingress = await createIngress({ cache: storage.cache });
    let ctx = root;
    ctx = withStorage(ctx, storage);
    ctx = withIngress(ctx, ingress);

    log('Starting sync...');
    await startSync(ctx);

    log('Starting API...');
    await startApi(ctx);
})();