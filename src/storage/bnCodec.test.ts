import { fromNano, toNano } from 'ton';
import { bnCodec } from './bnCodec';
describe('bnCodec', () => {
    it('should encode', () => {
        const encoded = bnCodec.encode(toNano(1000));
        const decoded = bnCodec.decode(encoded);
        expect(fromNano(decoded)).toEqual('1000');
    });
});