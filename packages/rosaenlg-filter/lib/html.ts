/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

import { specialSpacesToNormalSpaces } from './clean';

export interface ReplacedHtml {
  replaced: string;
  elts: string[];
}

export const blockLevelElts = [
  'address',
  'article',
  'aside',
  'blockquote',
  'canvas',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'noscript',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tfoot',
  'ul',
  'video',
  // special ones
  'li_block',
  'ul_block',
  'ol_block',
];
export const inlineElts = [
  'a',
  'abbr',
  'acronym',
  'b',
  'bdo',
  'big',
  'br',
  'button',
  'cite',
  'code',
  'dfn',
  'em',
  'i',
  'img',
  'input',
  'kbd',
  'label',
  'map',
  'object',
  'output',
  'q',
  'samp',
  'script',
  'select',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'textarea',
  'time',
  'tt',
  'var',
  // special ones
  'li_inline',
  'ul_inline',
  'ol_inline',
];

export function replaceHtml(input: string): ReplacedHtml {
  // console.log(input);

  const replacedHtml: ReplacedHtml = { replaced: null, elts: [] };

  const regexHtml = new RegExp('<(/?)([a-zA-Z_]+).*?>', 'g'); // _ to support li_*
  replacedHtml.replaced = input.replace(regexHtml, function (match: string, begin: string, tag: string): string {
    // console.log(`match: ${match} / tag: ${tag}`);
    replacedHtml.elts.push(match);
    if (blockLevelElts.indexOf(tag) > -1) {
      if (begin === '/') {
        return '☚';
      } else {
        return '☛';
      }
    } else {
      // inlineElts or other
      if (begin === '/') {
        return '☜';
      } else {
        return '☞';
      }
    }
    // console.log(`rosaenlg-filtering: html tag nature unknown: ${tag} => considered as inline elt`);
  });

  return replacedHtml;
}

function cleanReplacedTag(tag: string): string {
  // <td¤ class="texteGenere" id="14"¤> issues
  return specialSpacesToNormalSpaces(tag.replace('_block', '').replace('_inline', ''));
  /*
    .replace('li_block', 'li')
    .replace('li_inline', 'li')
    .replace('ul_block', 'ul')
    .replace('ul_inline', 'ul')
    .replace('ol_block', 'ol')
    .replace('ol_inline', 'ol');
  */
}

export function replacePlaceholders(input: string, elts: string[]): string {
  // console.log(input);

  const regexPlaceholder = new RegExp('[☛☚☞☜]', 'g');
  const res = input.replace(regexPlaceholder, function (): string {
    //console.log(`match: ${match} / tag: ${placeholder}`);
    const tag = elts.shift();
    //console.log(tag);
    if (typeof tag === 'undefined') {
      const err = new Error();
      err.name = 'InternalError';
      err.message = `There are not enough html tags`;
      throw err;
    }
    return cleanReplacedTag(tag);
  });

  if (elts.length > 0) {
    const err = new Error();
    err.name = 'InternalError';
    err.message = `There are left html tags: ${elts}`;
    throw err;
  }

  return res;
}

const protectMap = {
  AMPROTECT: '&amp;',
  LTPROTECT: '&lt;',
  GTPROTECT: '&gt;',
};

export function protectHtmlEscapeSeq(input: string): string {
  let res: string = input;
  for (const key in protectMap) {
    res = res.replace(protectMap[key], key);
  }
  return res;
}

export function unProtectHtmlEscapeSeq(input: string): string {
  let res: string = input;
  for (const key in protectMap) {
    res = res.replace(key, protectMap[key]);
  }
  return res;
}
