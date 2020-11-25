/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

const assert = require('assert');
const rosaenlgPug = require('../../dist/index.js');

const allTest = [
  'text',
  'code',
  'conditions',
  'enums',
  'switch',
  'synonyms',
  'hassaid',
  'val',
  'foreach',
  'each',
  'mixins',
  'value',
  'misc',
  'verb',
  'comments',
  'adj',
  'possessives',
  'choosebest',
];

function removeExtraLineBreaksAndTrim(input) {
  const lines = input
    .replace(/[\r\n|\n|\r]*$/, '')
    .replace(/^[\r\n|\n|\r]*/, '')
    .split('\n');
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].trim();
  }
  return lines.join('\n');
}

// const commandLineTests = process.argv.slice(3);

describe('rosaenlg-yseop', function () {
  describe('unit', function () {
    allTest.forEach(function (testSetKey) {
      const testSet = require(`./unit/${testSetKey}`);

      Object.keys(testSet).forEach(function (testKey) {
        const test = testSet[testKey];

        const language = test.length === 3 ? test[2] : 'en_US';
        const rosaenlgtemplate = test[0];

        // check that it is a compliant RosaeNLG template
        // it throws an exception when there is an error
        rosaenlgPug.compile(rosaenlgtemplate, { language: language });

        const transformed = removeExtraLineBreaksAndTrim(
          rosaenlgPug.render(rosaenlgtemplate, {
            yseop: true,
            language: language,
            string: true,
          }),
        );
        const expected = removeExtraLineBreaksAndTrim(test[1]);

        // make the real test
        it(`${testSetKey}: ${testKey}`, function () {
          assert.strictEqual(transformed, expected);
        });
      });
    });
  });
});
