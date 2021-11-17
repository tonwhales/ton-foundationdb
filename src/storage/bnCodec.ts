import BN from "bn.js";

export const bnCodec = {
    encode: (src: BN) => {
        let hex = src.toString('hex');
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }
        return Buffer.from(hex, 'hex');
    },
    decode: (src: Buffer) => {
        return new BN(src);
    }
}