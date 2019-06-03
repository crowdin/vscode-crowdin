import * as assert from 'assert';

suite("Extension Tests", function () {

    test("Example", function () {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(1, [1, 2, 3].indexOf(2));
    });
});