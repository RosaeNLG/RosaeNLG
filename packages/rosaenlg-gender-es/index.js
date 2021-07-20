/**
 * @license
 * Copyright 2019 Ludan Stoecklé, 2016 Samuel Westrich
 * SPDX-License-Identifier: MIT
 */

'use strict';

// from https://en.wiktionary.org/wiki/Category:Spanish_nouns_with_irregular_gender
const wikiExceptions = {
  anagrama: 'm',
  aroma: 'm',
  atleta: 'n',
  axioma: 'm',
  boricua: 'n',
  califa: 'm',
  cama: 'f',
  camión: 'm',
  Canadá: 'f',
  capibara: 'm',
  carisma: 'm',
  clima: 'm',
  cometa: 'm',
  cura: 'm',
  cólera: 'n',
  día: 'm',
  diagrama: 'm',
  dilema: 'm',
  diploma: 'm',
  disco: 'n', // the masculine "disco" can refer to a throwing disc (such as the sport discus) but can also be a shortening of the feminine "discoteca"
  dogma: 'm',
  drama: 'm',
  emblema: 'm',
  enigma: 'm',
  esquema: 'm',
  eurodrama: 'm',
  fantasma: 'm',
  foto: 'f',
  fotograma: 'm',
  gorila: 'm',
  guardia: 'n',
  guía: 'n',
  hematoma: 'm',
  holograma: 'm',
  idioma: 'm',
  idiota: 'n',
  indígena: 'n',
  israelita: 'n',
  karma: 'm',
  mano: 'f',
  mapa: 'm',
  monarca: 'n',
  monotrema: 'm',
  morfema: 'm',
  moto: 'f',
  nirvana: 'm',
  orden: 'm',
  panorama: 'm',
  pijama: 'n',
  pirata: 'n',
  piyama: 'n',
  planeta: 'm',
  plasma: 'm',
  poema: 'm',
  policía: 'f',
  problema: 'm',
  profeta: 'n',
  proteasoma: 'm',
  psiquiatra: 'n',
  quechua: 'n',
  radio: 'f', // well, usually
  reo: 'n',
  reuma: 'n',
  reúma: 'n',
  semita: 'n',
  sida: 'm',
  SIDA: 'm',
  sistema: 'm',
  sofá: 'm',
  soprano: 'm',
  síntoma: 'm',
  telegrama: 'm',
  tema: 'm',
  teorema: 'm',
  testigo: 'm',
  tranvía: 'm',
  trauma: 'm',
  vietnamita: 'n',
  xilema: 'm',
  estratega: 'n',
  panda: 'n',
  bueno: 'n',
};

module.exports = function (str) {
  //info can be found here http://www.spanishdict.com/topics/show/1

  if (wikiExceptions[str]) {
    return wikiExceptions[str];
  }

  if (str.endsWith('ista') || str.endsWith('ente')) {
    return 'n';
  }

  //If it ends in -o, -e, an accented vowel (á, é, í, ó, ú), -ma, or a consonant other than -d, -z, or ión, it's masculine.

  const lastLetter = str[str.length - 1], // Last letter of str
    last2Letters = str.slice(-2), // Last 3 letters of str
    last3Letters = str.slice(-3);

  // we should have all of them is the exceptions list?
  // istanbul ignore next
  if (last2Letters === 'ma') return 'm';

  if (last3Letters === 'ión' || last3Letters === 'zón') {
    const exeptions = ['corazón', 'sentención', 'notición', 'roción', 'ansión', 'avión'];
    if (exeptions.indexOf(str) > -1) {
      return 'm';
    } else {
      return 'f';
    }
  }

  switch (lastLetter) {
    case 'o':
    case 'e':
    case 'á':
    case 'é':
    case 'í':
    case 'ó':
    case 'ú': {
      const exeptions = [
        'foto',
        'llave',
        'fe',
        'mano',
        'calle',
        'moto',
        'fiebre',
        'libido',
        'carne',
        'radio',
        'frase',
        'polio',
        'gente',
        'virago',
        'nieve',
        'noche',
        'nube',
        'sangre',
        'suerte',
        'tarde',
        'muerte',
        'madre',
        'base',
        'clase',
        'clave',
        'corriente',
        'fuente',
        'llave',
        'sede',
        'serpiente',
        'torre',
        'hache',
      ];
      if (exeptions.indexOf(str) > -1) {
        return 'f';
      } else {
        return 'm';
      }
    }
  }

  switch (
    lastLetter //a,d,z are feminin
  ) {
    case 'a': {
      const exeptions = ['buda', 'día', 'planeta', 'mapa'];
      if (exeptions.indexOf(str) > -1) {
        return 'm';
      } else {
        return 'f';
      }
    }
    case 'd': {
      const exeptions = ['huésped', 'ataúd', 'abad', 'alud', 'áspid', 'laúd', 'récord', 'milord', 'césped'];
      if (exeptions.indexOf(str) > -1) {
        return 'm';
      } else {
        return 'f';
      }
    }
    case 'z': {
      const exeptions = [
        'aprendiz',
        'cáliz',
        'arroz',
        'pez',
        'lápiz',
        'ajedrez',
        'antifaz',
        'maíz',
        'albornoz',
        'avestruz',
        'altavoz',
        'altramuz',
        'arroz',
        'barniz',
        'cariz',
        'disfraz',
        'haz',
        'matiz',
      ];
      if (exeptions.indexOf(str) > -1) {
        return 'm';
      } else {
        return 'f';
      }
    }
  }

  //the rest are masculine except

  const exeptions = ['miel', 'sal', 'hiel', 'piel', 'coliflor', 'sor', 'labor', 'flor', 'mujer'];
  if (exeptions.indexOf(str) > -1) {
    return 'f';
  } else {
    return 'm';
  }
};
