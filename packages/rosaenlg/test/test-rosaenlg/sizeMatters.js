/**
 * @license
 * Copyright 2021 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

// last size version 2.1.8 kB
const noCompSize = {
  fr_FR: 239,
  en_US: 328,
  de_DE: 212,
  it_IT: 237,
  es_ES: 216,
  OTHER: 132,
};

const compSize = {
  fr_FR: 8450,
  en_US: 1485,
  de_DE: 43802,
  it_IT: 9917,
  es_ES: 1338,
  OTHER: 1212,
};

const assert = require('assert');
const fs = require('fs');

const filesDir = 'dist/rollup/';

function getIsComp(filename) {
  return filename.indexOf('_comp') > -1;
}

function getLanguage(filename) {
  const res = filename.match(/rosaenlg_tiny_(.*)_[0-9]+\.[0-9]+\.[0-9]+.*\.js/);
  return res[1];
}

function getRefSize(isComp, lang) {
  if (isComp) {
    return compSize[lang];
  } else {
    return noCompSize[lang];
  }
}

function getSize(filename) {
  const stats = fs.statSync(filesDir + filename);
  return stats.size / 1024;
}

const toleration = 0.05; // 5%

describe('rosaenlg', function () {
  describe('check bundle size', function () {
    const files = fs.readdirSync(filesDir);
    for (const file of files) {
      const lang = getLanguage(file);
      const isComp = getIsComp(file);
      const refSize = getRefSize(isComp, lang);
      const realSize = getSize(file);
      it(file, function () {
        const diff = Math.abs(refSize - realSize) / refSize;
        assert(diff < toleration, `${file} is ${realSize} kB, while expected is ${refSize}, diff is ${diff}`);
      });
    }
  });
});