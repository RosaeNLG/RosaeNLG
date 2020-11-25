/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

import { createInterface, ReadLine } from 'readline';
import * as fs from 'fs';

const irregulars = ['bello', 'buono', 'grande', 'santo'];

export function processItalianAdjectives(inputFile: string, outputFile: string, cb: Function): void {
  console.log(`starting to process Italian resource file: ${inputFile} for adjectives`);

  const adjectivesInfo: any = {};

  try {
    const lineReader: ReadLine = createInterface({
      input: fs.createReadStream(inputFile, { encoding: 'latin1' }),
    });

    const outputStream: fs.WriteStream = fs.createWriteStream(outputFile);

    lineReader
      .on('line', function (line: string): void {
        const lineData: string[] = line.split('\t');
        if (lineData.length != 3) {
          return;
        }
        const flexForm: string = lineData[0];
        // On.	onorevole	ADJ:pos+f+s
        if (flexForm.indexOf('.') > -1) {
          return;
        }

        const lemma: string = lineData[1];
        const props: string[] = lineData[2].split(':');

        if (props.length != 2) {
          return;
        }
        const derivational: string[] = props[0].split('-');
        if (derivational.length < 1) {
          return;
        }
        const type = derivational[0];
        const inflectional: string[] = props[1].split('+');

        if (
          (type === 'ADJ' && inflectional.indexOf('pos') > -1 && irregulars.indexOf(lemma) === -1) ||
          (type === 'VER' && inflectional.indexOf('part') > -1 && inflectional.indexOf('past') > -1)
        ) {
          /*
          educati	educare	VER:part+past+p+m
          educato	educare	VER:part+past+s+m
          brutalizzato	brutalizzare	VER:part+past+s+m
          */
          //console.log(`${flexForm} ${lemma} ${inflectional}`);

          let gender: 'M' | 'F';
          if (inflectional.indexOf('m') > -1) {
            gender = 'M';
          } else if (inflectional.indexOf('f') > -1) {
            gender = 'F';
          } else {
            console.log(`${line} has no gender!`);
          }

          let number: 'S' | 'P';
          if (inflectional.indexOf('s') > -1) {
            number = 'S';
          } else if (inflectional.indexOf('p') > -1) {
            number = 'P';
          } else {
            console.log(`${line} has no number!`);
          }

          // create obj
          if (!adjectivesInfo[lemma]) {
            adjectivesInfo[lemma] = {
              MS: null, // used only for verbs
              MP: null,
              FS: null,
              FP: null,
            };
          }
          const adjectiveInfo: any = adjectivesInfo[lemma];
          const actual = adjectiveInfo[gender + number];
          if (!actual) {
            adjectiveInfo[gender + number] = flexForm;
          } else {
            // grand'	grande	ADJ:pos+f+p
            if (actual.endsWith("'")) {
              console.log(`${gender}${number} for ${lemma} was ${actual}, will become ${flexForm}`);
              adjectiveInfo[gender + number] = flexForm;
            } else if (type === 'VER') {
              // we do not replace when comes from a Verb, Adj is better
            } else {
              console.log(`${gender}${number} for ${lemma} was ${actual}, will NOT become ${flexForm}`);
              // do not replace here
            }
          }
        }
      })
      .on('close', function (): void {
        /* 
        // find exceptions for test cases
        Object.keys(adjectivesInfo).forEach(function(key: string): void {
          if (!adjectivesInfo[key]['FS']) {
            console.log(`FS is null for ${key}`);
          }
        });
        */

        /*
        Object.keys(adjectivesInfo).forEach(function(key: string): void {
          if (adjectivesInfo[key]['MS'] != key) {
            console.log(`adj is ${key} while MS is ${adjectivesInfo['MS']}!`);
          }
        });
        */
        //console.log(adjectivesInfo);

        Object.keys(adjectivesInfo).forEach(function (key: string): void {
          // for verbs key must become MS, not the infinitive verb
          const ms: string = adjectivesInfo[key]['MS'];
          if (ms) {
            // there are some exceptions without MS...
            if (ms != key) {
              adjectivesInfo[ms] = adjectivesInfo[key];
              delete adjectivesInfo[key];
            }
            delete adjectivesInfo[ms]['MS'];
          }
        });

        outputStream.write(JSON.stringify(adjectivesInfo));
        console.log('done, produced: ' + outputFile);
        cb();
      });
  } catch (err) {
    console.log(err);
    cb();
  }
}
