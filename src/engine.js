import { EVENT, CURATED_DOCS, STATUS, STATUS_ORDER } from './data.js';

export const WEIGHTS = Object.freeze({authority:.40,directness:.25,independence:.15,temporal:.15,completeness:.05});
const now=()=>new Date().toISOString();
const clone=o=>JSON.parse(JSON.stringify(o));
const strip=s=>String(s||'').replace(/\s+/g,'').replace(/[，。；,.;:：！!？?"'“”‘’（）()]/g,'').toLowerCase();
const h=(s)=>{let x=2166136261;for(const ch of String(s)){x^=ch.codePointAt(0);x=Math.imul(x,16777619)}return (x>>>0).toString(16)};
const dateOK=s=>!s||/^\d{4}-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const DAY=(s)=>s?String(s).slice(0,10):'';
export function matchEvent(text,title='') {
 const s=strip(`${title} ${text}`);
 const core=/(双成药业|海南双成药业)/.test(s),target=/(奥拉股份|奥拉半导体|宁波奥拉)/.test(s);
 const unrelatedTarget=/(其他标的|其他公司|另一家标的|另一笔并购)/.test(s);
 const restart=/(再次筹划|重新发起|重新筹划|再次收购|新一轮收购)/.test(s);
 if (core&&target&&restart) return {decision:'review',reason:'历史交易已终止，可能属于重新发起的新事项，须核验交易连续性。'};
 if (core&&target&&!unrelatedTarget) return {decision:'merge',reason:'公司与交易对象一致，且未发现重新发起交易的明确迹象。'};
 if (core&&target&&unrelatedTarget) return {decision:'review',reason:'材料可能涉及多个交易标的，需确认是否同一事项。'};
 if (core&&!target) return {decision:'review',reason:'找到上市公司但没有明确交易对象，不能仅按股票代码强行合并。'};
 return {decision:'new',reason:'未识别到本事件所要求的上市公司与交易对象组合；不自动合并。'};
}
export function classifySentence(sentence,sourceKind='manual'){
 const s=sentence.trim();
 if(/(传闻|网传|据传|小道消息|市场消息|有消息称|未经证实)/.test(s)||sourceKind==='social')return 'rumor';
 if(/(预计|有望|或将|可能|未来|或许|假如|若|如果|预期|推测)/.test(s))return 'speculation';
 if(/(认为|观点|看好|分析师指出|利好|利空|有利于|不利于|建议|判断)/.test(s)||sourceKind==='research')return 'opinion';
 return 'fact';
}
export function topicOf(sentence){
 const s=strip(sentence);
 if(/(终止|取消|停止推进|不再推进|放弃)/.test(s)&&!/(尚未终止|未终止|终止传闻不实)/.test(s))return 'termination';
 if(/(已经完成交割|完成收购|收购已完成|完成并购)/.test(s))return 'completion';
 if(/(尚未完成|未完成交割|未能完成|并未完成)/.test(s))return 'completion';
 if(/(正式协议|签署协议|签约)/.test(s))return 'signing';
 if(/(复牌|股价|涨停|跌停|股市|股票)/.test(s))return 'market';
 if(/(对价|条款|谈判|分歧)/.test(s))return 'reason';
 if(/(预案|交易方案|重组方案)/.test(s))return 'proposal';
 if(/(筹划|拟收购|拟购买|计划收购)/.test(s))return 'planning';
 if(/(审批|审议|审核|获批)/.test(s))return 'approval';
 return 'general';
}
function polarityOf(s,topic){
 if (/(尚未|未能|没有|未|并未|不再|否认|不实|未完成|未签)/.test(s)){
   if(topic==='completion'||topic==='signing')return 'refute';
 }
 return 'support';
}
export function extractClaims(text,sourceKind='manual') {
 const chunks=String(text||'').replace(/\r/g,'').split(/[。；;！!\n]+/).map(x=>x.trim()).filter(x=>x.length>=8);
 const relevant=chunks.filter(s=>/(收购|重组|奥拉|双成|交易|签署|签约|终止|并购|交割|股价|跌停|涨停|利润|预计)/.test(s));
 const out=[];
 for(const s of relevant.slice(0,7)){
   const kind=classifySentence(s,sourceKind),topic=topicOf(s);
   out.push({id:`claim-${h(s)}-${out.length}`,text:s.slice(0,240),quote:s.slice(0,240),kind,topic,polarity:polarityOf(s,topic),extraction:'rules'});
 }
 return out;
}
export function evidenceScore(doc,claim,provenanceVerified=false){
 const kind=doc.kind||'manual';
 let authority={official:95,media:70,research:65,social:20,manual:35}[kind]??35;
 if(!provenanceVerified) authority=Math.min(authority,45); // Manual attribution must not become verified authority.
 const directness=(claim?.kind==='rumor')?25:/(公告|决定|披露|明确|已经|完成|终止|尚未|未能)/.test(claim?.quote||'')?95:65;
 const independence=doc.originGroup&&String(doc.originGroup).startsWith('reprint')?15:doc.reprintOf?15:provenanceVerified?92:35;
 const temporal=doc.disclosedAt?95:40;
 const completeness=doc.url&&doc.text&&claim?.quote&&doc.text.includes(claim.quote)?95:doc.text&&claim?.quote&&doc.text.includes(claim.quote)?58:20;
 const parts={authority,directness,independence,temporal,completeness};
 const score=Math.round(Object.entries(WEIGHTS).reduce((sum,[k,v])=>sum+(parts[k]||0)*v,0));
 return {score,parts,note:provenanceVerified?'已核对公开来源':'手动导入：来源身份和正文未独立核实，来源权威性受限'};
}
export function createState(){return {schema:2,event:clone(EVENT),documents:[],versions:[],changes:[],notifications:[],watching:false,logs:[],pending:[],replay:{active:false,next:0},ui:{},createdAt:now()};}
function audit(state,kind,message,metadata={}){state.logs.unshift({id:`log-${h(message+Math.random())}`,kind,message,at:now(),metadata});state.logs=state.logs.slice(0,160);}
export function addEvidence(state,input,{replay=false}={}){
 const st=clone(state), text=String(input.text||'').trim(),title=String(input.title||'').trim();
 if(!title||!text)throw new Error('标题与正文均不能为空。');
 if(text.length>15000)throw new Error('材料正文不能超过15000字。');
 if(!dateOK(input.disclosedAt))throw new Error('披露日期格式无效。');
 if(!dateOK(input.happenedAt))throw new Error('事件发生日期格式无效。');
 const preset=CURATED_DOCS.some(d=>d.id===input.id && d.text===input.text && d.url===input.url); // Only code-shipped fixtures can be verified.
 // Import routes must never accept a self-declared "curated" provenance from the user.
 const matched=preset?{decision:'merge',reason:'预先核对的主案例正式来源。'}:matchEvent(text,title);
 const normalized=strip(text);
 const dup=st.documents.find(d=>strip(d.text)===normalized || (d.url&&input.url&&d.url===input.url && strip(d.text)===normalized));
 if(dup){audit(st,'duplicate',`重复导入已阻止：${title}`,{existing:dup.id});return {state:st,decision:'duplicate',document:dup,changed:false,reason:'内容指纹匹配已有文档'};}
 if(matched.decision!=='merge'){
   const item={id:`pending-${h(title+text)}`,title,text,url:input.url||'',decision:matched.decision,reason:matched.reason,at:now()};
   st.pending.unshift(item);audit(st,'match',`材料未自动合并：${title}`,{decision:matched.decision,reason:matched.reason});
   return {state:st,decision:matched.decision,changed:false,reason:matched.reason};
 }
 const docId=preset?input.id:`doc-${Date.now()}-${h(text).slice(0,6)}`;
 const taken=Array.isArray(input.claims)&&preset?clone(input.claims):Array.isArray(input.aiClaims)&&!preset?
   input.aiClaims.filter(c=>text.includes(c.quote)&&typeof c.text==='string').slice(0,7).map((c,i)=>({...c,id:`claim-${h(c.quote)}-${i}`,extraction:'llm'})):
   extractClaims(text,input.kind||'manual');
 const doc={...clone(input),id:docId,text,title,claims:taken.map((c,i)=>({...c,id:c.id||`claim-${h(c.quote)}-${i}`})),eventId:EVENT.id,
  provenance:preset?'curated':'manual',checked:preset,matchReason:matched.reason, fetchedAt:now(),updatedAt:now(),
  originGroup:input.originGroup||`source-${h((input.url||'')+text)}`};
 delete doc.aiClaims;
 doc.claims=doc.claims.filter(c=>doc.text.includes(c.quote));
 doc.claims=doc.claims.map(c=>({...c,assessment:evidenceScore(doc,c,preset)}));
 st.documents.push(doc);st.documents.sort((a,b)=>(a.disclosedAt||'9999').localeCompare(b.disclosedAt||'9999')||a.fetchedAt.localeCompare(b.fetchedAt));
 audit(st,'ingestion',`文档接入成功：${doc.title}`,{docId,claimCount:doc.claims.length,matched:matched.decision,provenance:doc.provenance});
 const before=st.versions.at(-1)||null;
 // Event transitions only from source-checked curated records. Manual content cannot forge an official notice.
 if(preset&&input.status){
   const candidate=input.status;
   const reason=input.impact||`新披露材料支持事件进入${STATUS[candidate]||candidate}阶段`;
   const relevantClaims=doc.claims.map(c=>c.id);
   const prevStatus=before?.status||'unknown';
   if(prevStatus!==candidate){
     const ver={id:`v${st.versions.length+1}`,status:candidate,label:STATUS[candidate]||'待确认',
      summary:input.summary,reason,evidenceIds:[doc.id],claimIds:relevantClaims,
      disclosedThrough:doc.disclosedAt||null,generatedAt:now(),priorId:before?.id||null};
     st.versions.push(ver);
     if(before){
       const change={id:`change-${h(ver.id+doc.id)}`,from:before.id,to:ver.id,oldStatus:prevStatus,newStatus:candidate,
          summary:`${STATUS[prevStatus]} → ${STATUS[candidate]}`,reason,evidenceIds:[doc.id],at:now(),importance:candidate==='terminated'||candidate==='completed'?'major':'normal'};
       st.changes.push(change);
       if(st.watching){
         st.notifications.unshift({id:`note-${h(change.id)}`,changeId:change.id,eventId:EVENT.id,at:now(),read:false,
           title:`${EVENT.name}：${change.summary}`,body:reason,importance:change.importance});
       }
     }
     audit(st,'version',`事件状态更新：${STATUS[prevStatus]} → ${STATUS[candidate]}`,{docId,version:ver.id});
   }
 }
 if(!preset){
   const potential=doc.claims.some(c=>['completion','termination','signing'].includes(c.topic));
   if(potential){audit(st,'verification','新材料涉及重大交易状态，但来源未经独立核实，事件当前状态保持不变。',{docId});}
 }
 return {state:st,decision:'merge',document:doc,changed:(st.versions.length>(state.versions?.length||0)),reason:matched.reason};
}
export function buildInitialState(){let s=createState();for(const d of CURATED_DOCS){s=addEvidence(s,d).state;}s.logs.unshift({id:'init',kind:'system',message:'已载入经过来源核对的历史案例；版本为按披露顺序回放生成。',at:now(),metadata:{}});return s;}
export function beginReplay(state){let s=createState();s.watching=!!state.watching;s.replay={active:true,next:0};audit(s,'replay','开始历史回放，严格按披露时间输入材料。');return s;}
export function replayNext(state){let s=clone(state);if(!s.replay?.active)throw new Error('未处于历史回放模式');const index=s.replay.next;if(index>=CURATED_DOCS.length)return {state:s,done:true};const r=addEvidence(s,CURATED_DOCS[index],{replay:true});s=r.state;s.replay.next=index+1;if(s.replay.next>=CURATED_DOCS.length)s.replay.active=false;return {state:s,done:!s.replay.active,result:r};}
export function latestVersion(state){return state.versions.at(-1)||null;}
export function summaryOf(state){const v=latestVersion(state);return {status:v?.status||'unknown',label:v?.label||'待确认',summary:v?.summary||'尚无经过核实的事件结论。',evidence:v?.evidenceIds||[],lastDisclosure:v?.disclosedThrough||null};}
export function groupClaims(state){
 const map=new Map();for(const d of state.documents)for(const c of d.claims){const key=c.topic||'general';if(!map.has(key))map.set(key,[]);map.get(key).push({...c,documentId:d.id,documentTitle:d.title,checked:d.checked,publisher:d.publisher,disclosedAt:d.disclosedAt,sourceUrl:d.url});}
 return [...map.entries()].map(([topic,claims])=>({topic,claims}));
}
export function inspectConflict(state,topic){
 const claims=groupClaims(state).find(x=>x.topic===topic)?.claims||[];
 const supports=claims.filter(c=>c.polarity==='support'),refutes=claims.filter(c=>c.polarity==='refute');
 const dates=new Set(claims.map(c=>c.disclosedAt));
 const hasContradiction=supports.length>0&&refutes.length>0&&dates.size===1;
 return {claims,supports,refutes,relationship:hasContradiction?'potential_conflict':supports.length&&refutes.length?'time_or_condition_review':'no_direct_conflict',
 reason:hasContradiction?'存在同日相反表述，须进一步检查指向的具体时点及限定条件。':supports.length&&refutes.length?'材料出现不同说法，但可能涉及事件阶段、时点或条件差异；不能自动判为事实冲突。':'未发现直接相反的事实性主张。'};
}
export function toggleWatch(state){const s=clone(state);s.watching=!s.watching;audit(s,'watch',s.watching?'用户关注该事件':'用户取消关注该事件');return s;}
export function markNotificationsRead(state){const s=clone(state);for(const n of s.notifications)n.read=true;return s;}
export function clearPending(state,id){const s=clone(state);s.pending=s.pending.filter(p=>p.id!==id);return s;}
export function classifySample(s){return {kind:classifySentence(s,'manual'),topic:topicOf(s)};}
