import { createInterface, ReadLine } from "readline";
import * as fs from "fs"

import * as Debug from "debug";
const debug = Debug("german-verbs");

function processGermanVerbs(inputFile:string, outputFile:string):void {
  console.log(`starting to process German dictionary file: ${inputFile} for verbs`);

  let outputData: any = {};

  try {
    var lineReader:ReadLine = createInterface({
      input: fs.createReadStream(inputFile)
    });

    if (fs.existsSync(outputFile)) { fs.unlinkSync(outputFile); }
    var outputStream:fs.WriteStream = fs.createWriteStream(outputFile);

    /*
      sehen sehen VER,INF,NON
      sehend sehen VER,PA1,NON
      gesehen sehen VER,PA2,NON
      sah sehen VER,1,SIN,PRT,NON
      sah sehen VER,3,SIN,PRT,NON
      sahen sehen VER,1,PLU,PRT,NON
      sahen sehen VER,3,PLU,PRT,NON
      sahst sehen VER,2,SIN,PRT,NON
      saht sehen VER,2,PLU,PRT,NON
      sehe sehen VER,1,SIN,KJ1,NON
      sehe sehen VER,1,SIN,PRÄ,NON
      sehe sehen VER,3,SIN,KJ1,NON
      sehen sehen VER,1,PLU,KJ1,NON
      sehen sehen VER,1,PLU,PRÄ,NON
      sehen sehen VER,3,PLU,KJ1,NON
      sehen sehen VER,3,PLU,PRÄ,NON
      sehest sehen VER,2,SIN,KJ1,NON
      sehet sehen VER,2,PLU,KJ1,NON
      seht sehen VER,2,PLU,PRÄ,NON
      seht sehen VER,IMP,PLU,NON
      sieh sehen VER,IMP,SIN,NON
      siehst sehen VER,2,SIN,PRÄ,NON
      sieht sehen VER,3,SIN,PRÄ,NON
      sähe sehen VER,1,SIN,KJ2,NON
      sähe sehen VER,3,SIN,KJ2,NON
      sähen sehen VER,1,PLU,KJ2,NON
      sähen sehen VER,3,PLU,KJ2,NON
      sähest sehen VER,2,SIN,KJ2,NON
      sähet sehen VER,2,PLU,KJ2,NON

möchte	mögen	VER:MOD:1:SIN:KJ2
möchte	mögen	VER:MOD:3:SIN:KJ2
möchten	mögen	VER:MOD:1:PLU:KJ2
möchten	mögen	VER:MOD:3:PLU:KJ2
möchtest	mögen	VER:MOD:2:SIN:KJ2
möchtet	mögen	VER:MOD:2:PLU:KJ2
möge	mögen	VER:MOD:1:SIN:KJ1
möge	mögen	VER:MOD:3:SIN:KJ1
mögen	mögen	VER:MOD:1:PLU:KJ1
mögen	mögen	VER:MOD:1:PLU:PRÄ
mögen	mögen	VER:MOD:3:PLU:KJ1
mögen	mögen	VER:MOD:3:PLU:PRÄ
mögen	mögen	VER:MOD:INF
mögest	mögen	VER:MOD:2:SIN:KJ1

gemocht	mögen	VER:MOD:PA2

aufgeräumt	aufräumen	VER:PA2:SFT

gekommen	kommen	VER:PA2
      */

    lineReader.on('line', function (line:string):void {
      const lineData:string[] = line.split('\t');
      const flexForm:string = (lineData[0] as any).toLocaleLowerCase('de-DE');
      const lemma:string = (lineData[1] as any).toLocaleLowerCase('de-DE');
      const props:string[] = lineData[2].split(':');

      if (props[0]=='VER' /* && lemma=='kommen' */ ) {

        //debug(`${flexForm} ${lemma} ${props}`);


        function extractNumber():'S'|'P' {
          if (props.includes('SIN')) return 'S';
          if (props.includes('PLU')) return 'P';

          var err = new Error();
          err.name = 'TypeError';
          err.message = `should have SIN or PLU: ${line}`;
          throw err;
        }
        function extractPerson():1|2|3 {
          if (props.includes('1')) return 1;
          if (props.includes('2')) return 2;
          if (props.includes('3')) return 3;

          var err = new Error();
          err.name = 'TypeError';
          err.message = `should have 1 or 2 or 3: ${line}`;
          throw err;  
        }
        function extractTense(): string {
          const tenses:string[] = ['PRÄ','PRT','KJ1','KJ2','IMP','INF','PA1','PA2','EIZ'];
          for (var i=0; i<tenses.length; i++) {
            if (props.includes(tenses[i])) return tenses[i];
          }
          var err = new Error();
          err.name = 'TypeError';
          err.message = `tense not found: ${line}`;
          throw err;  
        }

        let propTense:string = extractTense();
        let propNumber:'S'|'P';
        let propPerson:1|2|3;

        switch(propTense) {
          case 'PRÄ':
          case 'PRT':
          case 'KJ1':
          case 'KJ2':
            propPerson = extractPerson();
            // continue
          case 'IMP':
            propNumber = extractNumber();
            break;
          case 'INF':
          case 'PA1':
          case 'PA2':
          case 'EIZ':
            break;
        }

        // create obj
        // sehen[PRÄ][1][SIN]
        if ( outputData[lemma]==null ) {
          outputData[lemma] = {};
        }

        var verbData = outputData[lemma];

        if (propNumber) {

          if (verbData[propTense]==null) {
            verbData[propTense] = {};
          }
          var verbDataTense:any = verbData[propTense];

          if (propPerson) {

            if (verbDataTense[propNumber]==null) {
              verbDataTense[propNumber] = {};
            }
            var verbDataTenseNumber:any = verbDataTense[propNumber];

            verbDataTenseNumber[propPerson] = flexForm;

          } else { // IMP
            verbDataTense[propNumber] = flexForm;
          }
        } else {
          /*
          if (verbData[propTense]!=null && verbData[propTense]!=flexForm) {
            console.log(`${propTense} already exists for <${lemma}>: old:<${verbData[propTense]}> new:<${flexForm}>`)
          }
          */

          if (propTense=='PA2') {
            // for PA2 we keep all the flexForm during this step
            if (verbData[propTense]==null) {
              verbData[propTense] = [];
            }
            if (verbData[propTense].indexOf(flexForm)==-1) { // avoid duplicates
              verbData[propTense].push(flexForm);
            }

          } else {
            verbData[propTense] = flexForm;
          }
        }
        
      }
      

    }).on('close', function() {
      // debug(JSON.stringify(outputData));

      // check holes, useful mainly to create edge test cases
      /*
      Object.keys(outputData).forEach(function (verb) {
        if (outputData[verb]['PA2']==null) {
          console.log(`${verb} has no PA2`);
        }
        if (outputData[verb]['PRÄ']==null) {
          console.log(`${verb} has no PRÄ`);
        } else {

          ['S','P'].forEach(function(number) {
            if (outputData[verb]['PRÄ'][number]==null) {
              console.log(`${verb} has no PRÄ for ${number}`);
            } else {           
              for (var i=1; i<4; i++) {
                if (outputData[verb]['PRÄ'][number][i]==null) {
                  console.log(`${verb} has not person ${i} for ${number} PRÄ`);
                }
              }
            }
          });

        }
        if (outputData[verb]['PRT']==null) {
          console.log(`${verb} has no PRT`);
        }

      });
      */

      outputStream.write(JSON.stringify(outputData));
      console.log("done, produced: " + outputFile);
    });
  } catch (err) {
    console.log(err);
  }
}


processGermanVerbs('resources_src/german-pos-dict/dictionary.dump', 
  'resources_pub/verbs.json');