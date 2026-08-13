let catalog=[],section='All',selected=null;
const $=s=>document.querySelector(s);
async function load(){catalog=await fetch('data/pages.json').then(r=>r.json());renderFilters();renderList();select(catalog[0]);}
function renderFilters(){const names=['All',...new Set(catalog.map(p=>p.section))];$('#filters').innerHTML=names.map(n=>`<button data-section="${n}" class="${n===section?'active':''}">${n}</button>`).join('');document.querySelectorAll('#filters button').forEach(b=>b.onclick=()=>{section=b.dataset.section;renderFilters();renderList();});}
function filtered(){const q=$('#search').value.trim().toLowerCase();return catalog.filter(p=>(section==='All'||p.section===section)&&(!q||`${p.title} ${p.section} ${p.ocr}`.toLowerCase().includes(q)));}
function renderList(){const items=filtered();$('#status').textContent=`${items.length} of ${catalog.length} images`;$('#pages').innerHTML=items.map(p=>`<button data-id="${p.id}" class="${selected?.id===p.id?'active':''}">${p.label} — ${p.title}</button>`).join('');document.querySelectorAll('#pages button').forEach(b=>b.onclick=()=>select(catalog.find(p=>p.id===b.dataset.id)));}
function select(p){selected=p;const image=$('#pageImage');const viewer=image.closest('.viewer');const rotation=p.rotation??0;image.src=p.image;image.alt=p.title;image.style.setProperty('--rotation',`${rotation}deg`);viewer.classList.toggle('quarter-turn',rotation===90||rotation===270);viewer.dataset.rotation=String(rotation);$('#pageTitle').textContent=p.title;$('#pageSection').textContent=`${p.section} • ${p.label}`;$('#original').href=p.image;$('#ocr').textContent=p.ocr||'OCR unavailable';renderList();}
$('#search').addEventListener('input',renderList);$('#theme').onclick=()=>document.body.classList.toggle('dark');
$('#knowledgeLinks').innerHTML=['project-summary','selection-sequence','troubleshooting'].map(x=>`<a href="knowledge/${x}.md">${x.replace('-',' ')}</a>`).join('');
load();
