import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const pagesDir=path.join(root,'assets/pages');
const ocrDir=path.join(root,'ocr');
const groups={
  '1786654485902':['Identity','Backplate','Model 3210 backplate'],
  '1786654498597':['Front matter','Cover','Series 3200 service manual cover'],
  '1786654522999':['Front matter','Contents','Table of contents'],
  '1786654550830':['Section E','1E','Electrical and sound systems'],
  '1786654571094':['Section E','3E','Series 3200 wiring diagram, Section B'],
  '1786654582511':['Section E','2E','Wiring diagram color code'],
  '1786655934155':['Section B','1B','Selector switch and electric selector'],
  '1786655943542':['Section B','2B','Selector switch adjustment'],
  '1786655950205':['Section B','3B','Latch and control switch adjustment'],
  '1786655983189':['Section B','4B','Electric selector adjustments'],
  '1786655989640':['Section B','5B','Selector start, reverse and override switches'],
  '1786656000486':['Section B','6B','Override switch and rocker-arm adjustment'],
  '1786656007102':['Section B','7B','Driver solenoid and selector centering'],
  '1786656015083':['Section B','8B','Electric selector installation and centering'],
  '1786656036121':['Section B','9B','Electric selector centering'],
  '1786656044225':['Section B','10B','Junction box exploded view'],
  '1786656130793':['Section B','11B','200 electric selector exploded view'],
  '1786656141686':['Section B','12B','100 electric selector exploded view'],
  '1786656146645':['Section B','13B','100 electric selector parts list'],
  '1786656161160':['Section B','14B','Selector switch assembly exploded view'],
  '1786656165880':['Section B','15B','Selector switch assembly parts list'],
  '1786656174314':['Section B','16B','Top Tunes and album programming assembly'],
  '1786656182807':['Section B','17B','LP unit'],
  '1786656309802':['Section F','2F','Power, light, coin and credit failures'],
  '1786656316460':['Section F','3F','Coin and credit failure continued'],
  '1786656327777':['Section F','6F','Mechanical and electrical failures continued'],
  '1786656374692':['Section F','7F','Mechanical, electrical and sound failures'],
  '1786656382834':['Section F','8F','Sound failure continued'],
  '1786656388924':['Section F','9F','Top Tunes selector failure'],
  '1786656534182':['Section E','3E','Series 3200 wiring diagram, Section A'],
  '1786656565300':['Section E','4E','Series 3200 wiring diagram, Section B'],
  '1786656586123':['Section E','5E','Series 3200 wiring diagram, Section C'],
  '1786656605420':['Section E','6E','Model 3210 wiring diagram, Section A'],
  '1786656622280':['Section E','7E','Model 3210 wiring diagram, Section B'],
  '1786656635215':['Section E','8E','Model 548 amplifier schematic'],
  '1786656736108':['Section E','9E','548 amplifier bill of materials'],
  '1786656743902':['Section E','10E','Speaker layout and AC measurements'],
  '1786656749112':['Section E','11E','Amplifier printed-circuit board layouts'],
  '1786656761565':['Section E','12E','Speaker connections'],
  '1786656767091':['Section E','13E','Selection sequence 1–3'],
  '1786656779385':['Section E','14E','Selection sequence 3–7'],
  '1786656786123':['Section E','15E','Selection sequence 8–14'],
  '1786656801100':['Section E','16E','Selection reverse and changer sequence'],
  '1786656812088':['Section E','17E','Record changer sequence continued'],
  '1786656895688':['Section E','18E','Record changer sequence completion'],
  '1786656903262':['Section E','19E','3200 selection sequence 1–4'],
  '1786656910134':['Section E','20E','3200 selection sequence 5–9'],
  '1786656915505':['Section E','21E','3200 selection sequence 9–15'],
  '1786656923989':['Section E','22E','169-A remote volume control'],
  '1786656940632':['Section E','23E','Model 548 amplifier exploded view']
};
// Clockwise display correction for each original photograph. Originals stay untouched.
// Values are explicit so orientation can be reviewed and corrected independently of OCR.
const rotations={
  '1786654485902':0, '1786654498597':0, '1786654522999':0,
  '1786654539312':0, '1786654550830':0, '1786654571094':0,
   '1786654582511':0, '1786655934155':0, '1786655943542':90,
  '1786655950205':0, '1786655983189':90, '1786655989640':0,
  '1786656000486':0, '1786656007102':0, '1786656015083':90,
  '1786656036121':0, '1786656044225':0, '1786656130793':0,
   '1786656141686':270, '1786656146645':0, '1786656161160':180,
  '1786656165880':0, '1786656174314':270, '1786656182807':0,
  '1786656309802':0, '1786656316460':0, '1786656327777':0,
   '1786656374692':0, '1786656382834':0, '1786656388924':0,
  '1786656507223':0, '1786656534182':270, '1786656565300':0,
   '1786656586123':0, '1786656605420':0, '1786656622280':270,
  '1786656635215':0, '1786656736108':0, '1786656743902':0,
   '1786656749112':270, '1786656761565':270, '1786656767091':270,
   '1786656779385':270, '1786656786123':270, '1786656801100':0,
  '1786656812088':0, '1786656895688':270, '1786656903262':0,
   '1786656910134':0, '1786656915505':270, '1786656923989':0,
  '1786656940632':0
};
const excluded=new Set(['1786654539312','1786656507223']);
const files=fs.readdirSync(pagesDir).filter(f=>f.endsWith('.jpg')&&!excluded.has(f.match(/(\d{13})/)?.[1])).sort();
const catalog=files.map((file,i)=>{
  const key=file.match(/(\d{13})/)[1];
  const [section,label,title]=groups[key]??['Unsorted','unknown',file];
  const ocrFile=file.replace(/\.jpg$/,'.txt');
  let ocr=''; try{ocr=fs.readFileSync(path.join(ocrDir,ocrFile),'utf8').trim()}catch{}
  const rotation=rotations[key];
  if(![0,90,180,270].includes(rotation)) throw new Error(`Missing or invalid rotation for ${file}`);
  return {id:`p${String(i+1).padStart(3,'0')}`,section,label,title,image:`assets/pages/${file}`,sourceFile:file,rotation,ocr};
});
fs.mkdirSync(path.join(root,'data'),{recursive:true});
fs.writeFileSync(path.join(root,'data/pages.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(`Cataloged ${catalog.length} images`);
