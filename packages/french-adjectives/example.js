/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */


const adjectives = require('./dist/index.js');

// "belles"
console.log(adjectives.agree('beau', 'F', 'P'));

// "vieil"
console.log(adjectives.agree('vieux', 'M', 'S', 'homme', true));
