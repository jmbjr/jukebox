import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const catalogPath=path.join(root,'data/pages.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const outputDir=path.join(root,'ocr');
const rawDir=path.join(outputDir,'raw');
fs.mkdirSync(rawDir,{recursive:true});

function wordsFromTsv(tsv){
  const rows=tsv.trim().split('\n').slice(1).map(line=>line.split('\t'));
  return rows.filter(r=>r.length>=12&&Number(r[10])>=0&&r[11].trim()).map(r=>({confidence:Number(r[10]),text:r[11].trim()}));
}
function qualityFor(page,words){
  const mean=words.length?words.reduce((sum,w)=>sum+w.confidence,0)/words.length:0;
  const diagram=/schematic|wiring diagram/i.test(page.title);
  let status='poor';
  if(diagram)status='not suitable';
  else if(mean>=72&&words.length>=70)status='good';
  else if(mean>=52&&words.length>=25)status='partial';
  return {status,confidence:Number(mean.toFixed(1)),wordCount:words.length,engine:'tesseract 5 / eng',preprocessing:'oriented grayscale autocontrast sharpen'};
}

const tempRoot=fs.existsSync(os.tmpdir())?os.tmpdir():root;
const temp=fs.mkdtempSync(path.join(tempRoot,'jukebox-ocr-'));
try{
  for(const page of catalog){
    const input=path.join(root,page.image);
    const base=page.sourceFile.replace(/\.jpg$/,'');
    const normalized=path.join(temp,`${base}.png`);
    execFileSync('convert',[input,'-rotate',String(page.rotation||0),'-colorspace','Gray','-auto-level','-sharpen','0x0.8','-density','300',normalized]);
    const psm=/schematic|wiring diagram|exploded view/i.test(page.title)?'11':'3';
    const text=execFileSync('tesseract',[normalized,'stdout','-l','eng','--oem','1','--psm',psm],{encoding:'utf8',maxBuffer:20e6,stdio:['ignore','pipe','ignore']}).trim();
    const tsv=execFileSync('tesseract',[normalized,'stdout','-l','eng','--oem','1','--psm',psm,'tsv'],{encoding:'utf8',maxBuffer:30e6,stdio:['ignore','pipe','ignore']});
    const words=wordsFromTsv(tsv);
    fs.writeFileSync(path.join(outputDir,`${base}.txt`),text+'\n');
    fs.writeFileSync(path.join(rawDir,`${base}.tsv`),tsv);
    page.ocr=text;
    page.ocrQuality=qualityFor(page,words);
    console.log(`${page.label.padEnd(10)} ${page.ocrQuality.status.padEnd(12)} ${String(page.ocrQuality.confidence).padStart(5)}% ${words.length} words`);
  }
  fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
