/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */


import { GenderNumberManager } from './GenderNumberManager';

export class Helper {
  private genderNumberManager: GenderNumberManager;
  private spy: Spy;

  public constructor(genderNumberManager: GenderNumberManager) {
    this.genderNumberManager = genderNumberManager;
  }
  public setSpy(spy: Spy): void {
    this.spy = spy;
  }

  public getSorP(table: string[], obj: any): string {
    if (!table || table.length < 2) {
      const err = new Error();
      err.name = 'InvalidArgumentError';
      err.message = 'you must provide a table with 2 elements: S + P';
      throw err;
    }

    const number = this.genderNumberManager.getRefNumber(obj, null);

    if (number === 'P') {
      return table[1];
    }
    // default: number===null || number==='S'
    return table[0];
  }

  public getMFN(table: string[], obj: any): string {
    const gender = this.genderNumberManager.getRefGender(obj, null);

    if (!table || table.length === 0) {
      const err = new Error();
      err.name = 'InvalidArgumentError';
      err.message = `you must provide a table with elements MF(N)`;
      throw err;
    }

    if (gender === 'M') {
      return table[0];
    } else if (gender === 'F') {
      if (table.length < 2) {
        const err = new Error();
        err.name = 'InvalidArgumentError';
        err.message = `${obj} is Feminine, you must provide a table with 2 elements MF`;
        throw err;
      }
      return table[1];
    } else if (gender === 'N') {
      if (table.length < 3) {
        const err = new Error();
        err.name = 'InvalidArgumentError';
        err.message = `${obj} is Neutral, you must provide a table with 3 elements MFN`;
        throw err;
      }
      return table[2];
    } else {
      const err = new Error();
      err.name = 'InvalidArgumentError';
      err.message = `getMFN but ${JSON.stringify(obj)} has no gender`;
      throw err;
    }
  }

  public isSentenceStart(): boolean {
    /*
      .   xxxx
      .xxx
      ne marche pas sur les inline

      > xxxx
      >xxx
      attention car n'est pas vrai sur tous les tags : </b> ne marque pas une fin de phrase
    */

    // console.log("last characters: [" + this.spy.getPugHtml().substr(this.spy.getPugHtml().length - 6) + ']');
    if (/\.[\s|¤]*$/.test(this.spy.getPugHtml())) {
      return true;
    }
    if (/>[\s|¤]*$/.test(this.spy.getPugHtml())) {
      return true;
    }

    return false;
  }

  public getUppercaseWords(str: string): string {
    if (str && str.length > 0) {
      if (this.spy.isEvaluatingEmpty()) {
        return 'SOME_WORDS';
      } else {
        return str.replace(/\b\w/g, function (l: string): string {
          return l.toUpperCase();
        });
      }
    }
  }

  public hasFlag(params: any, flag: string): boolean {
    if (this.getFlagValue(params, flag)) {
      return true;
    } else {
      return false;
    }
  }

  public getFlagValue(params: any, flag: string): any {
    if (params) {
      if (flag) {
        return params[flag];
      } else {
        const err = new Error();
        err.name = 'InvalidArgumentError';
        err.message = 'getFlagValue flag value must not be null';
        throw err;
      }
    } else {
      return null;
    }
  }

  public protectString(str: string): string {
    return '§' + str + '§';
  }
}
