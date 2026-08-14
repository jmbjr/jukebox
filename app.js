const sections=[
  {key:'Section A',letter:'A',title:'Coin and Credit Equipment'},
  {key:'Section B',letter:'B',title:'Selector Switch and Electric Selector'},
  {key:'Section C',letter:'C',title:'Record Changer Adjustments'},
  {key:'Section D',letter:'D',title:'Cabinet'},
  {key:'Section E',letter:'E',title:'Electrical and Sound Systems'},
  {key:'Section F',letter:'F',title:'Trouble Shooting'}
];
let catalog=[],figures=[],active='Contents',selected=null;
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
  [catalog,figures]=await Promise.all([
    fetch('data/pages.json',{cache:'no-store'}).then(r=>r.json()),
    fetch('data/figures.json',{cache:'no-store'}).then(r=>r.json())
  ]);
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
  if(q)items=items.filter(p=>`${p.label} ${p.title} ${p.section} ${['good','partial'].includes(p.ocrQuality?.status)?p.ocr:''}`.toLowerCase().includes(q));
  return items;
}
function renderList(){
  const q=$('#search').value.trim();
  const items=itemsForActive();
  $('#status').textContent=q?`${items.length} search result${items.length===1?'':'s'}`:active==='Contents'?'Manual sections A–F':`${items.length} scanned page${items.length===1?'':'s'}`;
  $('#pages').innerHTML=items.map(p=>{const ocrMatch=q&&['good','partial'].includes(p.ocrQuality?.status)&&p.ocr.toLowerCase().includes(q.toLowerCase());return `<button data-id="${p.id}" class="${selected?.id===p.id?'active':''}">${p.label} — ${p.title}${ocrMatch?'<small class="match">OCR match</small>':''}</button>`}).join('');
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
  $('#pageTitle').textContent=p.title;$('#pageSection').textContent=`${p.section} • ${p.label}`;$('#original').href=p.image;
  const details=$('#ocr').closest('details'),quality=p.ocrQuality?.status||'poor',usable=['good','partial'].includes(quality),manual=p.ocrQuality?.engine==='manual transcription';
  details.hidden=!usable;details.open=false;
  details.querySelector('summary').textContent=manual?'Searchable transcription — manually verified':usable?`Searchable OCR text — ${quality}`:'OCR hidden because recognition quality is poor';
  $('#ocr').textContent=usable?p.ocr:'OCR unavailable for display. Use the page image as authority.';
  renderFigures(p);
  const ordered=active==='Reference'?referencePages():catalog.filter(x=>x.section===active).sort((a,b)=>pageNumber(a)-pageNumber(b)||a.label.localeCompare(b.label,undefined,{numeric:true}));
  const index=ordered.findIndex(x=>x.id===p.id);
  $('#previous').disabled=index<=0;$('#next').disabled=index<0||index===ordered.length-1;
  $('#previous').onclick=()=>index>0&&select(ordered[index-1]);$('#next').onclick=()=>index<ordered.length-1&&select(ordered[index+1]);
}
function renderFigures(page){
  const host=$('#figures'),items=figures.filter(f=>f.pageId===page.id).sort((a,b)=>Number(a.number)-Number(b.number));
  host.hidden=!items.length;
  host.innerHTML=items.map(f=>{const callouts=[...f.callouts].sort((a,b)=>Number(a.number)-Number(b.number)),positioned=f.calloutsPositioned===true;return `<article class="figure-card">
    <div class="figure-heading"><div><p class="eyebrow">Extracted figure ${f.number}</p><h2>${f.title}</h2></div><small>From page ${f.source.pageLabel}</small></div>
    <p class="figure-help">${positioned?'Select a numbered hotspot or index entry. Use Adjust positions to refine the saved locations.':'Select a numbered circle or index entry. Use Adjust positions to align the circles with the figure.'}</p>
    <div class="figure-tools">${positioned?'':`<div class="callout-palette" aria-label="Figure ${f.number} quick callouts">${callouts.map(c=>`<button type="button" data-figure="${f.id}" data-callout="${c.number}" aria-label="Callout ${c.number}: ${c.label}">${c.number}</button>`).join('')}</div>`}<button type="button" class="position-edit-toggle" data-figure="${f.id}">Adjust positions</button><button type="button" class="copy-positions" data-figure="${f.id}" hidden>Copy positions</button><span class="copy-status" aria-live="polite"></span></div>
    <div class="figure-layout">
      <div class="figure-image"><img src="${f.image}" alt="Figure ${f.number}: ${f.title}">${positioned?callouts.map(c=>`<button type="button" class="callout" style="--x:${c.x}%;--y:${c.y}%" data-figure="${f.id}" data-callout="${c.number}" aria-label="Callout ${c.number}: ${c.label}">${c.number}</button>`).join(''):''}</div>
      <div><div class="callout-detail" id="${f.id}-detail" aria-live="polite"><strong>Choose a callout</strong><span>Its manual description and part number will appear here.</span></div>
      <div class="callout-index" aria-label="Figure ${f.number} callout index">${callouts.map(c=>`<button type="button" data-figure="${f.id}" data-callout="${c.number}"><strong>${c.number}</strong><span>${c.label}</span></button>`).join('')}</div></div>
    </div>
    <p class="figure-source">Extracted from the photographed page. The full page remains authoritative.</p>
  </article>`}).join('');
  const selectCallout=button=>{
    const figure=figures.find(f=>f.id===button.dataset.figure),callout=figure.callouts.find(c=>c.number===button.dataset.callout);
    host.querySelectorAll(`[data-figure="${figure.id}"]`).forEach(item=>item.classList.toggle('active',item.dataset.callout===button.dataset.callout));
    document.getElementById(`${figure.id}-detail`).innerHTML=`<strong>Item ${callout.number}: ${callout.label}</strong><span>Part number: ${callout.partNumber||'not listed'}</span>`;
  };
  host.querySelectorAll('[data-figure][data-callout]').forEach(button=>button.onclick=()=>selectCallout(button));
  host.querySelectorAll('.figure-image .callout').forEach(button=>enableCalloutDrag(button,figures.find(f=>f.id===button.dataset.figure)));
  host.querySelectorAll('.position-edit-toggle').forEach(toggle=>toggle.onclick=()=>{
    const figure=figures.find(f=>f.id===toggle.dataset.figure),card=toggle.closest('.figure-card'),image=card.querySelector('.figure-image'),editing=!image.classList.contains('editing');
    image.classList.toggle('editing',editing);toggle.textContent=editing?'Finish adjusting':'Adjust positions';card.querySelector('.copy-positions').hidden=!editing;
    if(editing&&!image.querySelector('.callout')){
      image.insertAdjacentHTML('beforeend',figure.callouts.map(c=>`<button type="button" class="callout" style="--x:${c.x}%;--y:${c.y}%" data-figure="${figure.id}" data-callout="${c.number}" aria-label="Drag callout ${c.number}: ${c.label}">${c.number}</button>`).join(''));
      image.querySelectorAll('.callout').forEach(button=>{button.onclick=()=>selectCallout(button);enableCalloutDrag(button,figure);});
    }
  });
  host.querySelectorAll('.copy-positions').forEach(button=>button.onclick=async()=>{
    const figure=figures.find(f=>f.id===button.dataset.figure),payload={id:figure.id,callouts:figure.callouts.map(({number,x,y})=>({number,x:Number(x.toFixed(1)),y:Number(y.toFixed(1))}))},status=button.parentElement.querySelector('.copy-status');
    try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));status.textContent='Copied';}catch{status.textContent='Copy failed';}
  });
}
function enableCalloutDrag(button,figure){
  button.addEventListener('pointerdown',event=>{if(!button.parentElement.classList.contains('editing'))return;event.preventDefault();button.setPointerCapture(event.pointerId);button.classList.add('dragging');});
  button.addEventListener('pointermove',event=>{
    if(!button.hasPointerCapture(event.pointerId))return;
    const box=button.parentElement.getBoundingClientRect(),x=Math.max(0,Math.min(100,(event.clientX-box.left)/box.width*100)),y=Math.max(0,Math.min(100,(event.clientY-box.top)/box.height*100)),callout=figure.callouts.find(c=>c.number===button.dataset.callout);
    callout.x=x;callout.y=y;button.style.setProperty('--x',`${x}%`);button.style.setProperty('--y',`${y}%`);
  });
  button.addEventListener('pointerup',event=>{button.releasePointerCapture(event.pointerId);button.classList.remove('dragging');});
}
$('#search').addEventListener('input',()=>{renderList();if($('#search').value.trim()&&active==='Contents'){$('#contentsView').hidden=true;$('#pageView').hidden=true;}});
$('#theme').onclick=()=>document.body.classList.toggle('dark');
$('#home').onclick=$('#backToContents').onclick=()=>{active='Contents';renderContents();setSection('Contents');};
$('#knowledgeLinks').innerHTML=['project-summary','selection-sequence','troubleshooting'].map(x=>`<a href="knowledge/${x}.md">${x.replaceAll('-',' ')}</a>`).join('');
load();
