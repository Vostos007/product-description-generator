const { loadSemanticCore, getCategoryData } = require('./semanticCore');

describe('semanticCore', () => {
    test('semantic core loads and has expected categories', () => {
        const core = loadSemanticCore();
        expect(core).toHaveProperty('yarn');
        expect(core).toHaveProperty('tools');
        expect(core).toHaveProperty('patterns');
    });

    test('getCategoryData returns correct data', () => {
        const core = loadSemanticCore();
        const yarn = getCategoryData('yarn', core);
        expect(yarn).toBeDefined();
        expect(yarn).toHaveProperty('products');
        expect(yarn).toHaveProperty('keywords');
        expect(yarn).toHaveProperty('faq');
    });

    test('getCategoryData returns null for unknown category', () => {
        const core = loadSemanticCore();
        const unknown = getCategoryData('nonexistent', core);
        expect(unknown).toBeNull();
    });
}); 