const sections=[
  {key:'Section A',letter:'A',title:'Coin and Credit Equipment'},
  {key:'Section B',letter:'B',title:'Selector Switch and Electric Selector'},
  {key:'Section C',letter:'C',title:'Record Changer Adjustments'},
  {key:'Section D',letter:'D',title:'Cabinet'},
  {key:'Section E',letter:'E',title:'Electrical and Sound Systems'},
  {key:'Section F',letter:'F',title:'Trouble Shooting'}
];
let catalog=[],active='Contents',selected=null;
const $=s=>document.querySelector(s);
const pageNumber=p=>Number.parseInt(p.label,10)||Number.MAX_SAFE_INTEGER;
const canonicalSort=(a,b)=>{
  const ai=sections.findIndex(s=>s.key===a.section),bi=sections.findIndex(s=>s.key===b.section);
  const ar=ai<0?sections.length:ai,br=bi<0?sections.length:bi;
  return ar-br||pageNumber(a)-pageNumber(b)||a.label.localeCompare(b.label,undefined,{numeric:true});
};
const manualPages=()=>catalog.filter(p=>sections.some(s=>s.key===p.section)).sort(canonicalSort);
const referencePages=()=>catalog.filter(p=>!sections.some(s=>s.key===p.section));

async function load(){
  catalog=await fetch('data/pages.json',{cache:'no-store'}).then(r=>r.json());
  renderSections();renderContents();renderList();showContents();
}
function renderSections(){
  const items=[{key:'Contents',label:'Contents'},...sections.map(s=>({key:s.key,label:s.letter})),{key:'Reference',label:'Reference'}];
  $('#sections').innerHTML=items.map(i=>`<button data-section="${i.key}" class="${i.key===active?'active':''}">${i.label}</button>`).join('');
  $('#sections').querySelectorAll('button').forEach(b=>b.onclick=()=>setSection(b.dataset.section));
}
function renderContents(){
  $('#tocCards').innerHTML=sections.map(s=>{
    const count=catalog.filter(p=>p.section===s.key).length;
    return `<button class="toc-card" data-section="${s.key}"><span class="toc-letter">${s.letter}</span><span><strong>${s.title}</strong><small>${count?`${count} scanned page${count===1?'':'s'}`:'Not yet scanned'}</small></span></button>`;
  }).join('');
  $('#tocCards').querySelectorAll('button').forEach(b=>b.onclick=()=>setSection(b.dataset.section));
  const refs=referencePages();
  $('#supplemental').innerHTML=`<h2>Front matter and reference</h2><div>${refs.map(p=>`<button data-id="${p.id}">${p.label} — ${p.title}</button>`).join('')}</div>`;
  $('#supplemental').querySelectorAll('button').forEach(b=>b.onclick=()=>select(catalog.find(p=>p.id===b.dataset.id)));
}
function setSection(name){
  active=name;selected=null;renderSections();renderList();
  if(name==='Contents')showContents();else showSection();
}
function itemsForActive(){
  const q=$('#search').value.trim().toLowerCase();
  let items=active==='Reference'?referencePages():active==='Contents'?manualPages():catalog.filter(p=>p.section===active).sort((a,b)=>pageNumber(a)-pageNumber(b)||a.label.localeCompare(b.label,undefined,{numeric:true}));
  if(q)items=items.filter(p=>`${p.label} ${p.title} ${p.section} ${p.ocr}`.toLowerCase().includes(q));
  return items;
}
function renderList(){
  const q=$('#search').value.trim();
  const items=itemsForActive();
  $('#status').textContent=q?`${items.length} search result${items.length===1?'':'s'}`:active==='Contents'?'Manual sections A–F':`${items.length} scanned page${items.length===1?'':'s'}`;
  $('#pages').innerHTML=items.map(p=>`<button data-id="${p.id}" class="${selected?.id===p.id?'active':''}">${p.label} — ${p.title}</button>`).join('');
  $('#pages').querySelectorAll('button').forEach(b=>b.onclick=()=>select(catalog.find(p=>p.id===b.dataset.id)));
}
function showContents(){$('#contentsView').hidden=false;$('#pageView').hidden=true;}
function showSection(){
  const items=itemsForActive();
  if(items.length)select(items[0]);else{
    const meta=sections.find(s=>s.key===active);
    $('#contentsView').hidden=false;$('#pageView').hidden=true;
    $('#contentsView').innerHTML=`<p class="eyebrow">Section ${meta?.letter||''}</p><h1>${meta?.title||active}</h1><p class="empty">No pages from this section have been scanned yet.</p><button class="return" type="button">← Return to contents</button>`;
    $('.return').onclick=()=>setSection('Contents');
  }
}
function select(p){
  selected=p;active=sections.some(s=>s.key===p.section)?p.section:'Reference';renderSections();renderList();
  $('#contentsView').hidden=true;$('#pageView').hidden=false;
  const image=$('#pageImage'),viewer=image.closest('.viewer'),rotation=p.rotation??0;
  image.src=p.image;image.alt=p.title;image.style.setProperty('--rotation',`${rotation}deg`);
  viewer.classList.toggle('quarter-turn',rotation===90||rotation===270);viewer.dataset.rotation=String(rotation);
  $('#pageTitle').textContent=p.title;$('#pageSection').textContent=`${p.section} • ${p.label}`;$('#original').href=p.image;$('#ocr').textContent=p.ocr||'OCR unavailable';
  const ordered=active==='Reference'?referencePages():catalog.filter(x=>x.section===active).sort((a,b)=>pageNumber(a)-pageNumber(b)||a.label.localeCompare(b.label,undefined,{numeric:true}));
  const index=ordered.findIndex(x=>x.id===p.id);
  $('#previous').disabled=index<=0;$('#next').disabled=index<0||index===ordered.length-1;
  $('#previous').onclick=()=>index>0&&select(ordered[index-1]);$('#next').onclick=()=>index<ordered.length-1&&select(ordered[index+1]);
}
$('#search').addEventListener('input',()=>{renderList();if($('#search').value.trim()&&active==='Contents'){$('#contentsView').hidden=true;$('#pageView').hidden=true;}});
$('#theme').onclick=()=>document.body.classList.toggle('dark');
$('#home').onclick=$('#backToContents').onclick=()=>{active='Contents';renderContents();setSection('Contents');};
$('#knowledgeLinks').innerHTML=['project-summary','selection-sequence','troubleshooting'].map(x=>`<a href="knowledge/${x}.md">${x.replaceAll('-',' ')}</a>`).join('');
load();
