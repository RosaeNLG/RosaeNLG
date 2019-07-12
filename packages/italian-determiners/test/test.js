var assert = require('assert');
var lib = require('../dist/index.js');

const testCases = [
  ['DEFINITE', 'M', 'S', 'il'],
  ['DEFINITE', 'M', 'P', 'i'],
  ['DEFINITE', 'F', 'S', 'la'],
  ['DEFINITE', 'F', 'P', 'le'],
  ['INDEFINITE', 'M', 'S', 'un'],
  ['INDEFINITE', 'F', 'S', 'una'],
];

describe('italian-determiners', function() {
  describe('#getDet()', function() {
    describe('nominal', function() {
      testCases.forEach(function(testCase) {
        const detType = testCase[0];
        const gender = testCase[1];
        const number = testCase[2];
        const expected = testCase[3];

        it(`${detType} ${gender} ${number} => ${expected}`, function() {
          assert.equal(lib.getDet(detType, gender, number), expected);
        });
      });
    });

    describe('edge cases', function() {
      it('invalid det type', () => assert.throws(() => lib.getDet('blabla', 'M', 'S'), /determiner/));
      it('invalid gender', () => assert.throws(() => lib.getDet('DEFINITE', 'X', 'S'), /gender/));
      it('invalid number', () => assert.throws(() => lib.getDet('DEFINITE', 'M', 'X'), /number/));
      it('plural invalid for INDEFINITE', () => assert.throws(() => lib.getDet('INDEFINITE', 'M', 'P'), /plural/));
    });
  });
});