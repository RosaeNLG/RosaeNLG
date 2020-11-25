/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

/* 
  "choosebest" is a RosaeNLG specific tag that generates a specific portion of text multiple times
  and then chooses the best generated text. It does not exist in Yseop and is therefore not migrated.
*/

module.exports = {
  simple: [
    `
p
  choosebest {among: 10}
    synz
      syn
        | A
      syn
        | B
`,
    `
\\beginParagraph
  /* INFO a RosaeNLG choosebest mixin present here with params {among: 10} */
  \\beginSynonym
    \\choice
      A
    \\choice
      B
  \\endSynonym
\\endParagraph
`,
  ],
};
