/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

interface Mappings {
  [key: string]: string;
}

export class ProtectMapping {
  public protectedString: string;
  public mappings: Mappings;
  public constructor(protectedString, mappings) {
    this.protectedString = protectedString;
    this.mappings = mappings;
  }
}

export function unprotect(toUnprotect: string, mappings: Mappings): string {
  // console.log('input: ' + toUnprotect + ' / mappings: ' + JSON.stringify(mappings));
  let res: string = toUnprotect;
  for (const key in mappings) {
    // console.log('key/val: ' + key + '/' + mappings[key]);

    // we also just delete all the unnecessary special spaces
    const specialSpaces = new RegExp('¤', 'g');
    res = res.replace(key, mappings[key].replace(specialSpaces, ''));
  }

  return res;
}

export function protectBlocks(input: string): ProtectMapping {
  const regexProtect = new RegExp('§([^§]*)§', 'g');

  const mappings: Mappings = {};

  let index = 0;
  const protectedInput: string = input.replace(regexProtect, function (corresp, first): string {
    // console.log("§§§ :<" + corresp + '>' + first);
    // must not start with E otherwise creates issues with French constractions: d'ESCAPED
    const replacement = 'XESCAPED_SEQ_' + ++index;
    mappings[replacement] = first;
    return replacement;
  });

  // console.log('escaped: ' + protectedInput);
  return new ProtectMapping(protectedInput, mappings);
}
