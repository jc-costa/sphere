/* SPheRe Dashboard - CSV */
const S='1sApufLQS6G6nFu-P6q7jfjQIG1RFcgkopQUTS2rvQEg';
const U='https://docs.google.com/spreadsheets/d/'+S+'/export?format=csv&gid=0';
const RI=300000,CR=24,TR=10;
const M=[
 {e:'val-temp',c:'card-temp',k:'tempBME',u:'°C',d:1},
 {e:'val-humidity',c:'card-humidity',k:'humBME',u:'%',d:1},
 {e:'val-pressure',c:'card-pressure',k:'pressBME',u:'hPa',d:2},
 {e:'val-co2',c:'card-co2',k:'co2SGP',u:'ppm',d:0},
 {e:'val-light',c:'card-light',k:'tlsLUX',u:'lux',d:0}
];
let ci=null,lr=[],us=false;
const MN={tempBME:'Temperature',humBME:'Humidity',pressBME:'Pressure',co2SGP:'CO2',tlsLUX:'Light'};
const MU={tempBME:'°C',humBME:'%',pressBME:'hPa',co2SGP:'ppm',tlsLUX:'lux'};
let curMetric='tempBME';
function parseCSV(t){
 var r=[],ls=t.split(/\r?\n/);if(!ls.length)return r;
 var h=[],q=false,c='';
 for(var i=0;i<ls[0].length;i++){
  var x=ls[0][i];
  if(x=='"'){q=!q}else if(x==','&&!q){h.push(c.trim());c=''}else{c+=x}
 }
 h.push(c.trim());var ch=h.map(function(s){return s.replace(/^"|"$/g,'')});
 for(var i=1;i<ls.length;i++){
  var l=ls[i];if(!l.trim())continue;
  var v=[];q=false;c='';
  for(var j=0;j<l.length;j++){
   var x=l[j];
   if(x=='"'){q=!q}else if(x==','&&!q){v.push(c.trim());c=''}else{c+=x}
  }
  v.push(c.trim());var cv=v.map(function(s){return s.replace(/^"|"$/g,'')});
  var o={};
  ch.forEach(function(hd,idx){
   var vl=cv[idx]||'';
   if(!isNaN(parseFloat(vl))&&isFinite(vl)&&vl!==''){vl=parseFloat(vl)}
   o[hd]=vl
  });
  if(o['Data/Hora']&&o['Data/Hora']!=='')r.push(o)
 }
 return r
}
async function fet(){
 var r=await fetch(U),t=await r.text();
 var d=parseCSV(t);console.log('Fetched '+d.length+' rows');return d
}
function glv(d){return d.length?d[d.length-1]:null}
function pcd(d,key){
 key=key||'tempBME';
 var s=d.slice(-CR),la=[],va=[];
 s.forEach(function(r){
  var ts=r['Data/Hora']||'',t='',p=ts.split(' ');
  if(p.length>1){var h=p[1].split(':');t=h[0]+':'+h[1]}else t=ts;
  la.push(t);var n=parseFloat(r[key]);va.push(isNaN(n)?null:n)
 });
 return{l:la,v:va}
}
const SD='Data/Hora,tempBME,humBME,pressBME,tlsLUX,co2SGP\n'+
'15/05/2026 18:46:41,28.89,91.19,1014.83,4.00,400.00\n'+
'15/05/2026 19:03:36,28.10,88.83,1014.95,0.00,405.00\n'+
'15/05/2026 19:24:35,28.06,89.33,1015.09,0.00,410.00\n'+
'15/05/2026 19:45:39,28.02,89.73,1015.23,0.00,402.00\n'+
'15/05/2026 20:06:39,28.02,89.84,1015.24,0.00,412.00\n'+
'15/05/2026 20:27:42,28.02,90.02,1015.12,0.00,412.00\n'+
'15/05/2026 20:48:40,28.01,90.17,1015.16,0.00,400.00\n'+
'15/05/2026 21:09:40,27.97,90.53,1015.42,0.00,412.00\n'+
'15/05/2026 21:30:48,28.00,90.57,1015.42,0.00,410.00\n'+
'15/05/2026 21:51:49,27.96,90.74,1015.31,0.00,401.00';
function updC(d){
 var lat=glv(d);if(!lat)return;
 M.forEach(function(m){
  var el=document.getElementById(m.e),cd=document.getElementById(m.c);
  var v=lat[m.k];
  if(el&&v!==undefined&&v!==''){var n=parseFloat(v);el.textContent=isNaN(n)?v:n.toFixed(m.d)}
  if(cd){cd.classList.remove('pulse');void cd.offsetWidth;cd.classList.add('pulse')}
 })
}
function updCh(d){
 var cv=document.getElementById('sensor-chart');if(!cv)return;
 if(ci){ci.destroy();ci=null}
 var lb=MN[curMetric]||'Value',un=MU[curMetric]||'';
 var ct=document.getElementById('chart-title');
 if(ct)ct.innerHTML='<i class="fas fa-chart-line"></i> '+lb+' ('+un+') (Last 24 Readings)';
 var pd=pcd(d,curMetric);
 ci=new Chart(cv.getContext('2d'),{
  type:'line',data:{labels:pd.l,datasets:[{label:lb+' ('+un+')',data:pd.v,
   borderColor:'#66BB6A',backgroundColor:'rgba(129,199,132,0.2)',borderWidth:2.5,
   pointRadius:3.5,pointBackgroundColor:'#66BB6A',pointBorderColor:'#fff',
   pointBorderWidth:1.5,pointHoverRadius:6,fill:true,tension:0.3}]},
  options:{responsive:true,maintainAspectRatio:true,
   aspectRatio:window.innerWidth<768?1.2:2,
   interaction:{intersect:false,mode:'index'},
   plugins:{legend:{position:'bottom',labels:{usePointStyle:true,padding:20,font:{size:12}}},
    tooltip:{backgroundColor:'rgba(46,125,50,0.9)',cornerRadius:8,padding:10}},
   scales:{x:{grid:{color:'rgba(165,214,167,0.3)'},ticks:{maxRotation:45,maxTicksLimit:12}},
    y:{beginAtZero:false,grid:{color:'rgba(165,214,167,0.3)'},ticks:{padding:8},
     title:{display:true,text:lb+' ('+un+')',color:'#66BB6A',font:{size:11,weight:'600'}}}}}
 })
}
function updT(d){
 var tb=document.getElementById('table-body');if(!tb)return;
 var sl=d.slice(-TR);
 if(!sl.length){tb.innerHTML='<tr><td colspan="4" class="loading-row">No data</td></tr>';return}
 var h='';
 for(var i=sl.length-1;i>=0;i--){
  var x=sl[i];
  var ts=x['Data/Hora']||'-',t=x['tempBME']!==undefined?x['tempBME']:'-';
  var hm=x['humBME']!==undefined?x['humBME']:'-',co=x['co2SGP']!==undefined?x['co2SGP']:'-';
  h+='<tr><td>'+esc(ts)+'</td><td>'+t+'</td><td>'+hm+'</td><td>'+co+'</td></tr>'
 }
 tb.innerHTML=h
}
function esc(s){
 var d=document.createElement('div');
 d.appendChild(document.createTextNode(s));return d.innerHTML
}
function updTS(){var e=document.getElementById('update-time');if(e)e.textContent=new Date().toLocaleTimeString()}
function showL(){var b=document.getElementById('loading-indicator');if(b)b.style.display='flex'}
function hideL(){var b=document.getElementById('loading-indicator');if(b)b.style.display='none'}
function showW(m){var b=document.getElementById('data-warning'),e=document.getElementById('warning-message');
 if(b)b.style.display='flex';if(e)e.textContent=m}
function hideW(){var b=document.getElementById('data-warning');if(b)b.style.display='none'}
function fin(r){
 us=false;hideW();hideL();lr=r;
 if(r.length){updC(r);updCh(r);updT(r);updTS()}
}
function fb(){
 if(us)return;us=true;hideL();
 showW('Sheet not published. File > Share > Publish to web. Showing sample data.');
 var sd=parseCSV(SD);lr=sd;
 if(sd.length){updC(sd);updCh(sd);updT(sd);updTS()}
}
function setActive(k){
 document.querySelectorAll('.metric-card').forEach(function(c){c.classList.remove('active')});
 var m=M.find(function(x){return x.k===k});
 if(m){var el=document.getElementById(m.c);if(el)el.classList.add('active')}
}
async function fau(){
 showL();
 try{var d=await fet();if(!d||!d.length)throw Error('empty');fin(d)}
 catch(e){console.warn('Error:',e.message);fb()}
}
function initSS(){
 var lks=document.querySelectorAll('.nav-link'),secs=document.querySelectorAll('.section[id]');
 function setA(id){lks.forEach(function(l){l.classList.toggle('active',l.getAttribute('data-section')===id)})}
 if('IntersectionObserver'in window){
  var obs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)setA(e.target.id)})},{rootMargin:'-80px 0px -50% 0px',threshold:0});
  secs.forEach(function(s){obs.observe(s)})
 }else{
  function onSc(){var y=window.pageYOffset+100,id='dashboard';secs.forEach(function(s){var t=s.offsetTop,h=s.offsetHeight;if(y>=t&&y<t+h)id=s.id});setA(id)}
  window.addEventListener('scroll',onSc,{passive:true});onSc()
 }
}
function initH(){
 var t=document.getElementById('nav-toggle'),n=document.getElementById('main-nav');
 if(!t||!n)return;
 t.addEventListener('click',function(){
  n.classList.toggle('open');var i=t.querySelector('i');
  if(i)i.className=n.classList.contains('open')?'fas fa-times':'fas fa-bars';
  t.setAttribute('aria-expanded',n.classList.contains('open'))
 });
 n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open');
  var i=t.querySelector('i');if(i)i.className='fas fa-bars';t.setAttribute('aria-expanded','false')})})
}
function initSC(){
 document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){
  var id=this.getAttribute('href');if(id==='#')return;
  var t=document.querySelector(id);if(t){e.preventDefault();
   window.scrollTo({top:t.getBoundingClientRect().top+window.pageYOffset-64,behavior:'smooth'})}
 })})
}
document.addEventListener('DOMContentLoaded',function(){
 hideL();fau();setInterval(fau,RI);
 initSS();initH();initSC();
 var rb=document.getElementById('retry-btn');
 if(rb){rb.addEventListener('click',function(){us=false;hideW();showL();fau()})}
 var ye=document.getElementById('footer-year');if(ye)ye.textContent=new Date().getFullYear();
 var fm=document.getElementById('contact-form');
 if(fm){fm.addEventListener('submit',function(e){e.preventDefault();
  var b=fm.querySelector('.btn-submit'),o=b.innerHTML;
  b.innerHTML='<i class="fas fa-check"></i> Sent!';b.style.backgroundColor='#4CAF50';
  setTimeout(function(){b.innerHTML=o;b.style.backgroundColor='';fm.reset()},3000)
 })}
 var t2;window.addEventListener('resize',function(){clearTimeout(t2);t2=setTimeout(function(){
  if(ci){ci.options.aspectRatio=window.innerWidth<768?1.2:2;ci.resize()}},250)})
 // Card click handlers for chart switching
 M.forEach(function(m){
  var el=document.getElementById(m.c);
  if(el){el.addEventListener('click',function(){curMetric=m.k;setActive(curMetric);if(lr.length){updCh(lr);updTS()}})}
 });
 setActive(curMetric);
})