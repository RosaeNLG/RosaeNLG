/**
 * @license
 * Copyright 2018, Ludan Stoecklé
 * SPDX-License-Identifier: MIT
 */

import { LanguageCodeGen, VerbInfo, WordInfo, AdjectiveInfo } from './LanguageCodeGen';
import { getWordInfo } from 'french-words';
import frenchVerbsDict from 'french-verbs-lefff/dist/conjugations.json';
import { VerbsInfo } from 'french-verbs-lefff';
import frenchWordsGenderLefff from 'french-words-gender-lefff';
import { GenderList } from 'french-words';
import { getAdjectiveInfo } from 'french-adjectives-wrapper';
import { getVerbInfo } from 'french-verbs';

export class LanguageCodeGenFrench extends LanguageCodeGen {
  iso2 = 'fr';
  hasFlexVerbs = true;
  hasFlexWords = true;
  hasFlexAdjectives = true;

  getVerbInfo(verb: string): VerbInfo {
    return getVerbInfo(frenchVerbsDict as VerbsInfo, verb);
  }
  getWordInfo(word: string): WordInfo {
    return getWordInfo(frenchWordsGenderLefff as GenderList, word);
  }
  getAdjectiveInfo(adjective: string): AdjectiveInfo {
    // NB no need to give an custom list here
    return getAdjectiveInfo(adjective, null);
  }
}
