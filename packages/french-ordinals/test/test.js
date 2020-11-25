/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

const assert = require('assert');
const lib = require('../dist/index.js');

const testCases = [
  [2, 'deuxième'],
  [67, 'soixante-septième'],
];

describe('french-ordinals', function () {
  describe('#getOrdinal()', function () {
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      it(`${testCase[1]}`, function () {
        assert.strictEqual(lib.getOrdinal(testCase[0]), testCase[1]);
      });
    }

    it(`out of bound`, function () {
      assert.throws(() => lib.getOrdinal(333), /only/);
    });
  });
});
