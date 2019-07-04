var LefffHelper = require('../dist/index.js').LefffHelper;
var assert = require('assert');

const lh = new LefffHelper();

const testCasesNouns = [['yeux', 'oeil'], ['genoux', 'genou'], ['bouteille', 'bouteille'], ['totoxxx', null]];

const testCasesAdj = [
  ['jaunes', 'jaune'],
  ['somptueuse', 'somptueux'],
  ['embarrassé', 'embarrassé'],
  ['embarrassées', 'embarrassé'],
  // adjectif verbal
  ['fatigante', 'fatigant'],
  ['environnantes', 'environnant'],
  ['convaincant', 'convaincant'],
  // participe passé
  ['fini', 'fini'],
  ['finies', 'fini'],
  ['totoxxx', null],
];

describe('lefff-helper', function() {
  describe('#getNoun()', function() {
    for (var i = 0; i < testCasesNouns.length; i++) {
      const testCase = testCasesNouns[i];
      it(`${testCase[0]} => ${testCase[1]}`, function() {
        assert.equal(lh.getNoun(testCase[0]), testCase[1]);
      });
    }
  });

  describe('#getAdj()', function() {
    for (var i = 0; i < testCasesAdj.length; i++) {
      const testCase = testCasesAdj[i];
      it(`${testCase[0]} => ${testCase[1]}`, function() {
        assert.equal(lh.getAdj(testCase[0]), testCase[1]);
      });
    }
  });

  describe('#isAdj()', function() {
    it(`vert`, function() {
      assert(lh.isAdj('vert'));
    });
    it(`adj not found`, function() {
      assert(!lh.isAdj('vertxxxx'));
    });
  });

  describe('#isNoun()', function() {
    it(`bleu`, function() {
      assert(lh.isNoun('bleu'));
    });
  });
});
