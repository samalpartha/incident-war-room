
import { handler } from '../../index';

describe('Entry Point', () => {
    test('should export a handler', () => {
        expect(handler).toBeDefined();
    });
});
