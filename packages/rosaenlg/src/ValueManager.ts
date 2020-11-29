/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

import { RefsManager, RepresentantType } from './RefsManager';
import { RandomManager } from './RandomManager';
import { AdjectiveManager } from './AdjectiveManager';
import { SynManager } from './SynManager';
import { Helper } from './Helper';
import { GenderNumberManager } from './GenderNumberManager';
import { LanguageImpl, DetTypes, DetParams, GrammarParsed } from './LanguageImpl';
import { PossessiveManager } from './PossessiveManager';
import { Numbers, Genders } from './NlgLib';
import { AsmManager } from './AsmManager';

import { Dist } from '../../english-determiners/dist';

export type AdjPos = 'BEFORE' | 'AFTER';

type AdjStructure = string | string[];

export interface ValueParams {
  owner: any;
  represents: any;
  gender: Genders;
  number: Numbers;
  genderOwned: Genders;
  numberOwned: Numbers;
  genderOwner: Genders;
  numberOwner: Numbers;
  case?: string; // GermanCases
  det: DetTypes;
  adj: AdjStructure;
  adjPos: AdjPos;
  dist: Dist;
  debug: boolean;
  dateFormat: string;
  REPRESENTANT: RepresentantType;
  AS_IS: boolean;
  TEXTUAL: boolean;
  ORDINAL_NUMBER: boolean;
  ORDINAL_TEXTUAL: boolean;
  FORMAT: string;
  possessiveAdj?: string; // it_IT only
  agree?: any; // when ORDINAL_TEXTUAL, for some languages
  useTheWhenPlural: boolean; // when a definite determiner and plural, en_US only
}

export class ValueManager {
  private languageImpl: LanguageImpl;
  private refsManager: RefsManager;
  private genderNumberManager: GenderNumberManager;
  private randomManager: RandomManager;
  private adjectiveManager: AdjectiveManager;
  private helper: Helper;
  private possessiveManager: PossessiveManager;
  private asmManager: AsmManager;
  private synManager: SynManager;

  private spy: Spy;

  private simplifiedStringsCache: Map<string, GrammarParsed>;

  public constructor(
    languageImpl: LanguageImpl,
    refsManager: RefsManager,
    genderNumberManager: GenderNumberManager,
    randomManager: RandomManager,
    adjectiveManager: AdjectiveManager,
    helper: Helper,
    possessiveManager: PossessiveManager,
    asmManager: AsmManager,
    synManager: SynManager,
  ) {
    this.languageImpl = languageImpl;
    this.refsManager = refsManager;
    this.genderNumberManager = genderNumberManager;
    this.randomManager = randomManager;
    this.adjectiveManager = adjectiveManager;
    this.helper = helper;
    this.possessiveManager = possessiveManager;
    this.asmManager = asmManager;
    this.synManager = synManager;
    this.simplifiedStringsCache = new Map();
  }
  public setSpy(spy: Spy): void {
    this.spy = spy;
  }

  public value(obj: any, params: ValueParams): void {
    if (typeof obj === 'undefined' || obj === null) {
      // PS: value of empty string is OK
      const err = new Error();
      err.name = 'InvalidArgumentError';
      err.message = `first parameter of value is null or undefined`;
      throw err;
    }

    // params is string when date
    if (typeof obj === 'string' && obj.charAt(0) === '<' && obj.charAt(obj.length - 1) === '>') {
      this.valueSimplifiedString(obj.substring(1, obj.length - 1), params);
      return; // don't do the rest, as it will call value again indirectly
    }

    if (params && params.owner) {
      const newParams: ValueParams = Object.assign({}, params);
      newParams.owner = null; // to avoid looping: we already take into account that param
      this.possessiveManager.thirdPossession(params.owner, obj, newParams);
      return;
    }

    // if first param is an array: we choose one
    const firstParam = this.synManager.synFctHelper(obj);

    if (typeof firstParam === 'number') {
      this.spy.appendPugHtml(this.valueNumber(firstParam, params));
    } else if (typeof firstParam === 'string') {
      this.spy.appendPugHtml(this.valueString(firstParam, params));
    } else if (firstParam instanceof Date) {
      this.spy.appendPugHtml(this.valueDate(firstParam, params ? params.dateFormat : null));
    } else if (firstParam.isAnonymous) {
      // do nothing
    } else if (typeof firstParam === 'object') {
      // it calls mixins, it already appends
      this.valueObject(firstParam, params);
    } else {
      const err = new Error();
      err.name = 'TypeError';
      err.message = `value not possible on: ${JSON.stringify(firstParam)}`;
      throw err;
    }

    if (params && params.represents) {
      this.genderNumberManager.setRefGender(params.represents, firstParam, params);
      // we cannot use setRefGenderNumber because sometimes obj is a word => dict lookup
      if (params.number) {
        this.genderNumberManager.setRefNumber(params.represents, params.number);
      }
    }
  }

  private valueDate(val: Date, dateFormat: string): string {
    //console.log(`FORMAT: ${dateFormat}`);
    if (this.spy.isEvaluatingEmpty()) {
      return 'SOME_DATE';
    } else {
      // return this.helper.protectString(...); // no, don't protect!!
      return this.languageImpl.getFormattedDate(val, dateFormat);
    }
  }

  private valueSimplifiedString(val: string, params: ValueParams): void {
    if (this.spy.isEvaluatingEmpty()) {
      this.spy.appendPugHtml('SOME_STRING');
      return;
    }

    let solved: GrammarParsed;

    solved = this.simplifiedStringsCache.get(val);
    if (!solved) {
      // console.log(`BEFORE: #${val}#`);
      try {
        solved = this.languageImpl.parseSimplifiedString(val);
        // console.log(solved);

        // manager unknown words
        if (solved.unknownNoun) {
          if (solved.gender != 'M' && solved.gender != 'F' && solved.gender != 'N') {
            const err = new Error();
            err.name = 'NotFoundInDict';
            err.message = `${solved.noun} is not in dict. Indicate a gender, M F or N!`;
            throw err;
          }
          delete solved['unknownNoun'];
        }

        this.simplifiedStringsCache.set(val, solved);
      } catch (e) {
        const err = new Error();
        err.name = 'ParseError';
        err.message = `could not parse <${val}>: ${e.message}`;
        throw err;
      }
    }

    // we keep the params
    const newParams: ValueParams = Object.assign({}, solved, params);
    delete newParams['noun'];
    if (params && params.debug) {
      console.log(`DEBUG: <${val}> => ${JSON.stringify(solved)} - final: ${solved.noun} ${JSON.stringify(newParams)}`);
    }
    this.value(solved.noun, newParams);
  }

  private valueString(val: string, params: ValueParams): string {
    if (this.spy.isEvaluatingEmpty()) {
      return 'SOME_STRING';
    }

    // simplest case but edge case
    if (!params) {
      return val;
    }

    if (this.languageImpl.hasCase) {
      params.case = params.case || this.languageImpl.defaultCase;
    }

    // we do not always need genderOwned: only in some situations
    // typically when generating a substantive (plural), we don't need it
    // if we request it anyway, we might end up with an exception when is not in dict
    if (params.det || params.adj || params.possessiveAdj || params.represents) {
      params.genderOwned = this.genderNumberManager.getRefGender(val, params);
    }

    // get the number of the *owneD* thing, not the ownerR
    // 'number': can be null, or S P, or point to an object
    params.numberOwned = this.genderNumberManager.getRefNumber(null, params) || 'S';

    // console.log(`here for ${val} with params: ${JSON.stringify(params)}`);

    const getAdjStringFromList = (adjectives: string[], separator: string, adjPos: AdjPos): string => {
      if (!adjectives || adjectives.length === 0) {
        return '';
      }
      const agreedAdjs = [];
      for (let i = 0; i < adjectives.length; i++) {
        agreedAdjs.push(
          this.adjectiveManager.getAgreeAdj(
            adjectives[i],
            val,
            {
              gender: params.gender,
              genderOwned: params.genderOwned,
              number: params.number,
              numberOwned: params.numberOwned,
              case: params.case,
              det: params.det,
              adjPos: adjPos, // we cannot use the params direct here: possible mix of before and after
            }, // we only copy the params that we really need
          ),
        );
      }
      const lastSep =
        agreedAdjs.length > 1
          ? '¤' + (separator != null ? separator : this.languageImpl.getDefaultLastSeparatorForAdjectives()) + '¤'
          : null;
      switch (agreedAdjs.length) {
        case 1:
          return agreedAdjs[0];
        case 2:
          return agreedAdjs.join(lastSep);
        default:
          return agreedAdjs.slice(0, agreedAdjs.length - 1).join(', ') + lastSep + agreedAdjs[agreedAdjs.length - 1];
      }
    };

    const getAdjPos = (adjPosParams: ValueParams): AdjPos => {
      let adjPos: AdjPos;
      if (adjPosParams && adjPosParams.adjPos) {
        adjPos = adjPosParams.adjPos;
        if (adjPos && adjPos != 'AFTER' && adjPos != 'BEFORE') {
          const err = new Error();
          err.name = 'InvalidArgumentError';
          err.message = 'adjective position must be either AFTER or BEFORE';
          throw err;
        }
      }
      if (!adjPos) {
        adjPos = this.languageImpl.defaultAdjPos as AdjPos;
      }
      return adjPos;
    };

    let adjBefore = '';
    let adjAfter = '';
    {
      if (params && params.adj) {
        if (params.adj['BEFORE'] || params.adj['AFTER']) {
          // is an object with BEFORE and AFTER params
          adjBefore = getAdjStringFromList(params.adj['BEFORE'], params.adj['SEP_BEFORE'], 'BEFORE');
          adjAfter = getAdjStringFromList(params.adj['AFTER'], params.adj['SEP_AFTER'], 'AFTER');
        } else {
          let adj = null; // used when not BEFORE + AFTER combined
          const adjPos = getAdjPos(params);
          if (typeof params.adj === 'string' || params.adj instanceof String) {
            adj = getAdjStringFromList([params.adj as string], null, adjPos);
          } else if (Array.isArray(params.adj)) {
            adj = getAdjStringFromList(params.adj, null, adjPos);
          } else {
            const err = new Error();
            err.name = 'InvalidArgumentError';
            err.message = 'adj param has an invalid structure';
            throw err;
          }
          switch (adjPos) {
            case 'BEFORE': {
              adjBefore = adj;
              break;
            }
            case 'AFTER': {
              adjAfter = adj;
              break;
            }
          }
        }
      }
    }
    const valSubst: string = this.languageImpl.getSubstantive(val, params.numberOwned, params.case);

    let possessiveAdj = '';
    if (params.possessiveAdj) {
      possessiveAdj = this.adjectiveManager.getAgreeAdj(params.possessiveAdj, val, params);
    }

    const everythingAfterDet = this.languageImpl.getFormattedNominalGroup(possessiveAdj, adjBefore, valSubst, adjAfter);

    // we have to generate the det at the end: in Spanish we need to know what follows the det
    let det = '';
    if (params && params.det) {
      const paramsForDet: DetParams = {
        genderOwned: params.genderOwned,
        numberOwned: params.numberOwned,
        genderOwner: params.genderOwner,
        numberOwner: params.numberOwner,
        case: params.case,
        dist: params.dist,
        after: everythingAfterDet.trim(), // spaces from adding adjectives
        useTheWhenPlural: params.useTheWhenPlural,
      };
      det = this.languageImpl.getDet(params.det, paramsForDet); // can return ''
      // console.log(`${JSON.stringify(paramsForDet)} => ${det}`);
    }

    return det + ' ' + everythingAfterDet;
  }

  private valueObject(obj: any, params: ValueParams): void {
    // console.log(obj);

    //- we already have the next one
    if (this.refsManager.getNextRef(obj)) {
      // console.log('we already have the next one');
      this.randomManager.setRndNextPos(this.refsManager.getNextRef(obj).rndNextPos);
      this.refsManager.deleteNextRef(obj);
    }

    if (params && params.REPRESENTANT === 'ref') {
      this.valueRef(obj, params);
    } else if (params && params.REPRESENTANT === 'refexpr') {
      this.valueRefexpr(obj, params);
    } else if (!this.refsManager.hasTriggeredRef(obj)) {
      this.valueRef(obj, params);
    } else if (obj.refexpr) {
      this.valueRefexpr(obj, params);
    } else {
      //- we trigger ref if obj has no refexpr
      this.valueRef(obj, params);
    }
  }

  private valueRefexpr(obj: any, params: ValueParams): void {
    // console.log('refexpr: ' + JSON.stringify(params));
    // is only called when obj.refexpr has a value
    this.spy.getPugMixins()[obj.refexpr](obj, params);
  }

  private valueRef(obj: any, params: any): void {
    //- printObj('value_ref', obj)
    if (obj.ref) {
      // console.log('value_ref_ok: ' + obj.ref);
      this.spy.getPugMixins()[obj.ref](obj, params);
    } else {
      const err = new Error();
      err.name = 'InvalidArgumentError';
      err.message = `${JSON.stringify(obj)} has no ref mixin`;
      throw err;
    }
    this.refsManager.setTriggeredRef(obj);
  }

  private valueNumber(val: number, params: ValueParams): string {
    if (this.spy.isEvaluatingEmpty()) {
      return 'SOME_NUMBER';
    } else {
      if (params && params.AS_IS) {
        return this.helper.protectString(val.toString());
      } else if (params && params.FORMAT) {
        return this.helper.protectString(this.languageImpl.getFormatNumberWithNumeral(val, params.FORMAT));
      } else if (params && params.TEXTUAL) {
        return this.languageImpl.getTextualNumber(val);
      } else if (params && params.ORDINAL_NUMBER) {
        return this.helper.protectString(this.languageImpl.getOrdinalNumber(val));
      } else if (params && params.ORDINAL_TEXTUAL) {
        if (val % 1 != 0) {
          // is not int
          const err = new Error();
          err.name = 'InvalidArgumentError';
          err.message = `ORDINAL_TEXTUAL must be an integer, here ${val}`;
          throw err;
        }

        // currently used only for it_IT and es_ES
        const gender = params.agree != null ? this.genderNumberManager.getRefGender(params.agree, params) : 'M';
        return this.languageImpl.getOrdinal(val, gender);
      } else {
        return this.helper.protectString(this.languageImpl.getStdFormatedNumber(val));
      }
    }
  }
}
