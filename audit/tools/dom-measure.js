() => {
  const visible = (e) => { const r=e.getBoundingClientRect(),s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; };
  const selector = (e) => { if(e.id)return '#'+CSS.escape(e.id); const parts=[]; while(e&&e.tagName&&parts.length<6){const tag=e.tagName.toLowerCase(),parent=e.parentElement; const peers=parent?[...parent.children].filter(x=>x.tagName===e.tagName):[]; parts.unshift(tag+(peers.length>1?`:nth-of-type(${peers.indexOf(e)+1})`:'')); if(tag==='main'||tag==='body')break;e=parent;}return parts.join(' > '); };
  const rgb = (value) => { const m=value.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const p=m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2],p[3]??1]; };
  const over = (a,b) => [a[0]*a[3]+b[0]*(1-a[3]),a[1]*a[3]+b[1]*(1-a[3]),a[2]*a[3]+b[2]*(1-a[3]),1];
  const lum = (a) => a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=[]; const nodes=[...document.querySelectorAll('body *')].filter(visible);
  for(const e of nodes){
    const text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();if(!text)continue;
    const s=getComputedStyle(e),fg=rgb(s.color);let unknown=null,chain=[],backgroundLayers=[],cur=e;
    while(cur){const cs=getComputedStyle(cur);if(cs.backgroundImage!=='none')unknown='background-image';if(Number(cs.opacity)!==1)unknown='ancestor-opacity';if(cs.filter!=='none'||cs.backdropFilter!=='none')unknown='filter';backgroundLayers.unshift(cs.backgroundColor);const c=rgb(cs.backgroundColor);if(c)chain.unshift(c);else unknown=unknown||'unsupported-css-color';cur=cur.parentElement;}
    let bg=[255,255,255,1];for(const c of chain)bg=over(c,bg);
    const large=Number(s.fontSize.replace('px',''))>=24||(Number(s.fontSize.replace('px',''))>=18.667&&Number(s.fontWeight)>=700),disabled=!!e.closest('[disabled],[aria-disabled="true"]');
    let ratio=null;if(fg&&!unknown){const f=over(fg,bg),l1=lum(f),l2=lum(bg);ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);}
    contrast.push({selector:selector(e),text:text.slice(0,100),color:s.color,background:bg.slice(0,3),backgroundLayers,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,ratio,threshold:large?3:4.5,large,disabled,unknown});
  }
  const controls=nodes.filter(e=>e.matches('button,input,select,textarea,a[href],[role="button"],[tabindex]')).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {selector:selector(e),tag:e.tagName,role:e.getAttribute('role'),name:e.getAttribute('aria-label')||[...((e.labels)||[])].map(l=>l.textContent).join(' ')||e.textContent?.trim().slice(0,100)||null,labelledBy:e.getAttribute('aria-labelledby'),labels:e.labels?.length??null,placeholder:e.getAttribute('placeholder'),width:r.width,height:r.height,x:r.x,y:r.y,disabled:!!e.disabled||e.getAttribute('aria-disabled')==='true',opacity:s.opacity,outline:s.outline,outlineOffset:s.outlineOffset,boxShadow:s.boxShadow,background:s.backgroundColor,color:s.color,fontSize:s.fontSize,lineHeight:s.lineHeight,cursor:s.cursor,transition:s.transitionDuration,tabindex:e.getAttribute('tabindex'),describedBy:e.getAttribute('aria-describedby'),invalid:e.getAttribute('aria-invalid')};});
  const headings=nodes.filter(e=>e.matches('h1,h2,h3,h4,h5,h6,[role="heading"]')).map(e=>({selector:selector(e),tag:e.tagName,text:e.textContent?.trim().slice(0,150),level:e.getAttribute('aria-level')}));
  const overflow=nodes.filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).map(e=>{const r=e.getBoundingClientRect();return {selector:selector(e),tag:e.tagName,left:r.left,right:r.right,text:e.textContent?.trim().slice(0,90),overflowX:getComputedStyle(e).overflowX};});
  return {url:location.href,viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,contrast,controls,headings,overflow,dialogs:nodes.filter(e=>e.matches('[role="dialog"],dialog,[aria-modal="true"]')).map(e=>({selector:selector(e),role:e.getAttribute('role'),modal:e.getAttribute('aria-modal'),label:e.getAttribute('aria-label'),labelledBy:e.getAttribute('aria-labelledby')})),activeElement:document.activeElement?selector(document.activeElement):null};
}

