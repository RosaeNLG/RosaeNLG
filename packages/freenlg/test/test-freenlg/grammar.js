var assert = require('assert');
const NlgLib = require('../../dist/NlgLib').NlgLib;

// could be cleaner
const parseFrench = require("../../dist/french-grammar.js").parse;
const parseGerman = require("../../dist/german-grammar.js").parse;
const parseEnglish = require("../../dist/english-grammar.js").parse;
const parsersMapping = {
  'fr_FR': parseFrench,
  'de_DE': parseGerman,
  'en_US': parseEnglish,
};


const testCasesList = {
  'fr_FR': [
    ["ce anneau",    {det:'DEMONSTRATIVE', noun:'anneau'} ],
    ["ce bel arbre", {det:'DEMONSTRATIVE', adj:'beau', adjPos:'BEFORE', noun:'arbre'}  ],
    ["le beau arbre F", {det:'DEFINITE', adj:'beau', adjPos:'BEFORE', noun:'arbre', gender:'F'} ],
    ["beau arbre F", {adj:'beau', adjPos:'BEFORE', noun:'arbre', gender:'F'} ],
    ["beau arbre", {adj:'beau', adjPos:'BEFORE', noun:'arbre'} ],
    ["le beau arbre", {det:'DEFINITE', adj:'beau', adjPos:'BEFORE', noun:'arbre'} ],
    ["la arbre", {det:'DEFINITE', noun:'arbre'} ],
    ["arbre", {noun:'arbre'} ],
    ["ce été", {det:'DEMONSTRATIVE', noun:'été'} ],
    ["un beau hâbleur", {det:'INDEFINITE', noun:'hâbleur', adj:'beau', adjPos:'BEFORE'} ],  
    ["ce exquis bague", {det:'DEMONSTRATIVE', noun:'bague', adj:'exquis', adjPos:'BEFORE'} ],
    ["une beau hommes", {det:'INDEFINITE', noun:'homme', adj:'beau', adjPos:'BEFORE'} ],
    ["les belles fleurs FP", {det:'DEFINITE', noun:'fleur', adj:'beau', adjPos:'BEFORE', gender:'F', number:'P'} ],
    ["les belles fleurs P", {det:'DEFINITE', noun:'fleur', adj:'beau', adjPos:'BEFORE', number:'P'} ],
    ["les belles fleurs P F", {det:'DEFINITE', noun:'fleur', adj:'beau', adjPos:'BEFORE', gender:'F', number:'P'} ],
    ["ce ancien maison", {det:'DEMONSTRATIVE', noun:'maison', adj:'ancien', adjPos:'BEFORE'} ],

    // ["cette maison ancienne", {det:'DEMONSTRATIVE', adj:'ancien', adjPos:'AFTER', noun:'maison'}],
  ],

  'de_DE': [
    ["das große Gurke", {det:'DEFINITE', noun:'Gurke', adj:'groß'} ],
    ["die neue Telefon", {det:'DEFINITE', noun:'Telefon', adj:'neu'} ],
    ["der alt Gurke", {noun:'Gurke', det:'DEFINITE', adj:'alt'}],
    ["dieses alt Telefon", {adj:'alt', noun:'Telefon', det:'DEMONSTRATIVE'}],
    ["dieser neue Gurke", {adj:'neu', noun:'Gurke', det:'DEMONSTRATIVE'}],
    ["der Auto", {noun:'Auto', det:'DEFINITE'}],
    ["Auto", {noun:'Auto'}],
    ["alt Auto", {adj:'alt', noun:'Auto'}],
    ["das gut Schwarzwald", {noun:'Schwarzwald', det:'DEFINITE', adj:'gut'}],
    ["das gut Daifukumochi M", {noun:'Daifukumochi', det:'DEFINITE', adj:'gut', gender:'M', unknownNoun:true}],
  ],

  'en_US': [
    ["apple", {noun:'apple'} ],
    ["the apple", {det:'DEFINITE', noun:'apple'} ],
    ["the big apple", {det:'DEFINITE', noun:'apple', adj:'big'} ],
    ["those big apple P", {det:'DEMONSTRATIVE', noun:'apple', adj:'big', number:'P', dist:'FAR'} ],
    ["this big apple S", {det:'DEMONSTRATIVE', noun:'apple', adj:'big', number:'S', dist:'NEAR'} ],
    ["an apple", {noun:'apple', det:'INDEFINITE'} ],
    ["these house P", {noun:'house', det:'DEMONSTRATIVE', number:'P', dist:'NEAR'} ],
  ],

}



describe('freenlg', function() {
  describe('grammar', function() {

    Object.keys(testCasesList).forEach(function(langKey) {

      describe(langKey, function() {


        const dictHelper = new NlgLib({language: langKey}).dictHelper;
    
        let cases = testCasesList[langKey];

        cases.forEach(function(theCase) {
          let toParse = theCase[0];
          let expected = theCase[1];
    
          let parsed = parsersMapping[langKey](toParse, {dictHelper: dictHelper});
          // console.log(parsed);

          it(`${langKey} ${toParse}`, function() {
            assert.deepEqual(parsed, expected)
          });
        });
        
      });
    
    });

  });
});
