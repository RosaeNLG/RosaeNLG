/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */


import { GenderNumberManager } from './GenderNumberManager';
import { RandomManager } from './RandomManager';
import { SaveRollbackManager } from './SaveRollbackManager';

import { Genders, Numbers } from './NlgLib';

export type RepresentantType = 'ref' | 'refexpr';
export type TriggeredRefs = Map<any, boolean>;
export type NextRefs = Map<any, NextRef>;

export interface NextRef {
  valueForDebug: string;
  REPRESENTANT: RepresentantType;
  gender: Genders;
  number: Numbers;
  rndNextPos: number;
}

export class RefsManager {
  // could be replaced by a List? but maybe less efficient as we lookup in it
  private triggeredRefs: TriggeredRefs;
  private nextRefs: NextRefs;

  // todo: more fine typing
  private saveRollbackManager: SaveRollbackManager;
  private genderNumberManager: GenderNumberManager;
  private randomManager: RandomManager;
  private spy: Spy;

  public constructor(
    saveRollbackManager: SaveRollbackManager,
    genderNumberManager: GenderNumberManager,
    randomManager: RandomManager,
  ) {
    this.saveRollbackManager = saveRollbackManager;
    this.genderNumberManager = genderNumberManager;
    this.randomManager = randomManager;

    this.triggeredRefs = new Map();
    this.nextRefs = new Map();
  }
  public setSpy(spy: Spy): void {
    this.spy = spy;
  }
  public getNextRefs(): NextRefs {
    return this.nextRefs;
  }
  public setNextRefs(nextRefs: NextRefs): void {
    this.nextRefs = nextRefs;
  }
  public getTriggeredRefs(): TriggeredRefs {
    return this.triggeredRefs;
  }
  public setTriggeredRefs(triggeredRefs: TriggeredRefs): void {
    this.triggeredRefs = triggeredRefs;
  }

  public getNextRef(obj: any): NextRef {
    return this.nextRefs.get(obj);
  }
  private setNextRef(obj: any, nextRef: NextRef): void {
    this.nextRefs.set(obj, nextRef);
  }

  public getNextRep(obj: any, params): NextRef {
    // console.log('GET NEXT REF');

    // there's already one planned
    if (this.getNextRef(obj)) {
      // console.log('already one planned');
      return this.getNextRef(obj);
    }

    if (!obj) {
      const err = new Error();
      err.name = 'InvalidArgumentError';
      err.message = `getNextRep called on null object`;
      throw err;
    }

    // simulate
    const rndNextPosBefore: number = this.randomManager.getRndNextPos();
    this.saveRollbackManager.saveSituation('nextRep');
    const hadRefBefore: boolean = this.hasTriggeredRef(obj);
    // console.log('hadRefBefore: ' + hadRefBefore);
    const lengthBefore: number = this.spy.getPugHtml().length;

    // cross dependency prevents from calling the function directly
    this.spy.getPugMixins().value(obj, params);

    // record the result before rollback

    const nextRef: NextRef = {
      valueForDebug: this.spy.getPugHtml().substring(lengthBefore),
      // we don't care about what will be triggered, but only if it has been triggered before
      REPRESENTANT: hadRefBefore ? 'refexpr' : 'ref',
      gender: this.genderNumberManager.getRefGender(obj, null),
      number: this.genderNumberManager.getRefNumber(obj, null),
      rndNextPos: rndNextPosBefore,
    };
    // console.log("getNextRep will be:" + JSON.stringify(nextRef));

    // rollback
    // pug_html = html_before;
    this.saveRollbackManager.rollback();

    // register the result
    // console.log(`BBB ${nextRef.gender} ${nextRef.number}`);
    this.genderNumberManager.setRefGenderNumber(nextRef, nextRef.gender, nextRef.number);

    // save the nextRef for use when it will actually be triggered
    this.setNextRef(obj, nextRef);

    return nextRef;
  }

  public resetRep(obj: any): void {
    this.triggeredRefs.delete(obj);
    // if we had asked for a next ref
    this.nextRefs.delete(obj);
  }

  public hasTriggeredRef(obj: any): boolean {
    return this.triggeredRefs.get(obj);
  }

  public setTriggeredRef(obj: any): void {
    this.triggeredRefs.set(obj, true);
  }

  public deleteNextRef(obj: any): void {
    this.nextRefs.delete(obj);
  }
}
