/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

const assert = require('assert');
const rosaenlgPug = require('../../dist/index.js');
const fs = require('fs');

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

const testCases = ['simple', 'include'];

describe('rosaenlg-yseop', function () {
  describe('templates', function () {
    testCases.forEach(function (testCase) {
      // test if it is a valid template
      // PS not clear why language is mandatory just to compile
      rosaenlgPug.compileFile(`${__dirname}/templates/${testCase}.pug`, { language: 'en_US' });

      const rendered = removeExtraLineBreaksAndTrim(
        rosaenlgPug.renderFile(`${__dirname}/templates/${testCase}.pug`, { yseop: true, string: true }),
      );
      const expected = removeExtraLineBreaksAndTrim(
        fs.readFileSync(`${__dirname}/templates/${testCase}.yseop`, 'utf-8'),
      );

      // make the real test
      it(`load file ${testCase}`, function () {
        assert.strictEqual(rendered, expected);
      });
    });
  });
});
