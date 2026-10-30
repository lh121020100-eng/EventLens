import {EVENT,CURATED_DOCS,STATUS,KIND,CLAIM_KIND} from './data.js';
import {buildInitialState,createState,beginReplay,replayNext,addEvidence,latestVersion,summaryOf,toggleWatch,markNotificationsRead,groupClaims,inspectConflict} from './engine.js';
const KEY='eventlens-state-v1';
const ICON={
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m12 7 3 5-3 5-3-5 3-5Z"/>',
 timeline:'<path d="M5 3v18M5 7h7l3 3h5M5 17h6l4-4h5"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="17" r="1"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/>',
 bookmark:'<path d="M5 3h14v18l-7-5-7 5V3Z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 left:'<path d="m14 5-7 7 7 7"/>',
 external:'<path d="M14 4h6v6m0-6-9 9"/><path d="M19 14v5H5V5h5"/>',
 shield:'<path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-4Z"/><path d="m8 12 3 3 5-6"/>',
 sparkles:'<path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/><path d="m20 17 .8 2.2L23 20l-2.2.8L20 23l-.8-2.2L17 20l2.2-.8L20 17Z"/>',
 chevron:'<path d="m9 6 6 6-6 6"/>',
 check:'<path d="m5 12 5 5L20 7"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 file:'<path d="M6 2h9l5 5v15H6V2Z"/><path d="M15 2v5h5M9 12h7M9 16h6"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 alert:'<path d="m12 2 10 19H2L12 2Z"/><path d="M12 8v6m0 3v.2"/>',
 sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
 close:'<path d="M5 5 19 19M19 5 5 19"/>',
 refresh:'<path d="M20 10V4l-4 4M4 14v6l4-4"/><path d="M5 10a7 7 0 0 1 12-4l3 4M19 14a7 7 0 0 1-12 4l-3-4"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7v.2"/>',
 stock:'<path d="M3 20h18M5 16l4-5 4 2 6-9M15 4h4v4"/>',
 share:'<circle cx="6" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 7 8 5"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 trend:'<path d="M3 17 9 11l4 3 7-8M15 6h5v5"/>',
 archive:'<path d="M3 4h18v5H3zM5 9v12h14V9M10 13h4"/>',
 flask:'<path d="M9 3h6M10 3v7l-6 10h16l-6-10V3M8 15h8"/>',
 download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 dot:'<circle cx="12" cy="12" r="2"/>',
};
const ic=(n,size=17)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]||ICON.info}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=s=>s?esc(String(s).replaceAll('-','.')):'未记录';
const dateTime=s=>s?esc(new Date(s).toLocaleString('zh-CN',{hour12:false})):'未记录';
const labelType=x=>CLAIM_KIND[x]||'事实性主张';
const pill=(s,color='')=>`<span class="pill ${color}">${esc(s)}</span>`;
const isUrl=s=>/^https:\/\//i.test(String(s||''));
function load(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o?.schema===2&&Array.isArray(o.documents))return o;}catch(e){}return buildInitialState()}
let state=load(),view='chat',selectedDoc=null,selectedClaim=0,drawer=null,activeVersion=0,aiMode='rules',aiStatus={configured:false,checked:false,model:null},chatAnswer=null,chatLoading=false,chatText='双成药业之前收购奥拉股份的事情，现在怎么样了？';
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){/* privacy/restricted storage: current session still works */}}
function update(s){state=s;persist();render();}
function alertUser(message){const previous=document.querySelector('.toast');if(previous)previous.remove();const div=document.createElement('div');div.className='toast';div.textContent=message;document.body.append(div);setTimeout(()=>div.remove(),3800);}
function currentDoc(){const a=state.documents;return a.find(d=>d.id===selectedDoc)||a.at(-1)||null;}
function navButton(key,icon,title,badgeCount){return `<button class="nav-item ${view===key?'active':''}" data-action="navigate" data-to="${key}">${ic(icon)}<span>${title}</span>${badgeCount?`<span class="nav-count">${badgeCount}</span>`:''}</button>`;}
function chrome(content){const unread=state.notifications.filter(n=>!n.read).length;return `<div class="layout"><aside class="rail"><div class="brand"><div class="logo">${ic('compass',22)}</div><div><strong>EventLens</strong><small>INVESTMENT INTELLIGENCE</small></div></div><div class="nav-label">WORKSPACE</div><nav class="nav">${navButton('chat','sparkles','AI 投研助手')}${navButton('detail','timeline','事件证据时间线')}${navButton('watch','bookmark','我的关注',state.watching?1:0)}${navButton('notifications','bell','动态通知',unread)}</nav><div class="nav-label">TOOLS</div><nav class="nav"><button class="nav-item" data-action="open-import">${ic('plus')}<span>导入新证据</span></button><button class="nav-item" data-action="open-audit">${ic('archive')}<span>处理记录</span></button><button class="nav-item" data-action="open-about">${ic('info')}<span>核验原则</span></button></nav><div class="rail-spacer"></div><div class="rail-bottom"><strong>核验透明，结论可溯</strong>演示数据采用公开公告；用户导入材料默认视为待核实，不会冒充官方来源。</div><div class="avatar"><div class="avatar-bubble">EL</div><div><strong>EventLens MVP</strong><small>本地浏览器会话</small></div></div></aside><main class="main"><header class="topbar"><div class="breadcrumb">INVESTMENT INTELLIGENCE <span style="color:#c2cad6;margin:0 10px">/</span> <strong>${view==='chat'?'AI 投研助手':view==='detail'?'证据时间线':view==='watch'?'我的关注':'动态通知'}</strong></div><div class="top-actions"><span class="pill blue">${aiMode==='llm'?'大模型已参与分析':aiStatus.configured?'AI 接口已配置 · 待调用':'规则模式 · API 未启用'}</span><button class="icon-button" aria-label="通知" data-action="navigate" data-to="notifications">${ic('bell',16)}${unread?'<span class="dot"></span>':''}</button><span class="user-chip">EventLens · V1.1</span></div></header><div class="content">${content}<div class="footer-note">EventLens · 公开数据的历史研究演示 · 手动导入材料未经独立验证 · 非投资建议</div></div></main></div>${drawer?drawDrawer():''}`;}
function actionToolbar(){return `<div class="toolbar"><button class="button small" data-action="open-import">${ic('plus',14)} 导入新证据</button><button class="button small" data-action="open-replay">${ic('refresh',14)} 历史回放</button><button class="button small ${state.watching?'secondary':''}" data-action="watch">${ic('bookmark',14)} ${state.watching?'已关注':'关注事件'}</button></div>`;}
function topHero(){const summ=summaryOf(state),latest=latestVersion(state),isLive=state.replay.active;const status=latest?.label||'待确认';const tone=latest?.status==='terminated'?'red':latest?.status==='completed'?'green':'blue';const market=state.documents.find(d=>d.claims.some(c=>c.topic==='market'));const first=state.documents.filter(d=>d.checked).at(0);return `<section class="card event-hero"><div class="hero-top"><div class="hero-category">事件档案 <span style="margin:0 8px;color:#d0d6e0">/</span> 重大资产重组 <span style="margin:0 8px;color:#d0d6e0">/</span> 002693</div><button class="button small ${state.watching?'secondary':''}" data-action="watch">${ic('bookmark',14)}${state.watching?'已关注':'关注事件'}</button></div><div class="hero-title"><h2>${esc(EVENT.name)}</h2>${pill(status,tone)}</div><div class="summary-line">${latest?esc(latest.summary):'尚未载入本事件的历史披露材料；请继续回放或导入证据。'}</div><div class="subline">${ic('shield',13)} ${latest?'当前结论来自已核对的公开原始来源':'暂无可核实的状态结论'} <span>·</span> 证据截至 ${fmt(latest?.disclosedThrough||'')} ${isLive?'· 历史回放中':''}</div><div class="hero-divider"></div><div class="hero-metrics"><div class="metric"><div class="metric-label">事件时间</div><div class="metric-value">${first?fmt(first.disclosedAt).slice(0,7):'—'} — ${latest?.disclosedThrough?fmt(latest.disclosedThrough).slice(0,7):'至今'}</div><div class="metric-desc">已核实公开披露的时间范围</div></div><div class="metric"><div class="metric-label">关联标的</div><div class="metric-value">双成药业 · 002693</div><div class="metric-desc">拟收购方 · 直接关联</div></div><div class="metric"><div class="metric-label">市场反应</div><div class="metric-value">${market?'终止消息后开盘跌停':'尚无已核实行情材料'}</div><div class="metric-desc">${market?'第一财经 2025.03.11 报道':'不生成未经核实的收益数字'}</div></div></div><div class="impact-inline">${ic('trend',17)}<strong>投资影响速览</strong><span>${esc(EVENT.impact)} ${esc(EVENT.caveat)}</span></div></section>`;}
function replayBanner(){if(!state.replay.active)return '';return `<div class="replay-banner"><span>${ic('clock',16)} 历史回放 · 已处理 ${state.replay.next}/${CURATED_DOCS.length} 条材料 · 只读取已披露证据</span><button class="button primary small" data-action="replay-next">${ic('arrow',14)} 导入下一条</button></div>`;}
function timeline(){return `<div class="card timeline-card"><div class="timeline-stats">${pill(`${state.documents.length} 份文档`)} ${pill(`${state.documents.reduce((n,d)=>n+d.claims.length,0)} 项主张`,'blue')} ${pill(`${state.versions.length} 个重要版本`)}</div><div class="timeline-list">${state.documents.length?state.documents.map((d,i)=>{const chosen=currentDoc()?.id===d.id;const type=d.kind==='official'?'公司公告':d.kind==='media'?'市场反应':'新增材料';const tone=d.status==='terminated'?'red':d.status?'blue':d.checked?'green':'amber';return `<div class="timeline-row ${chosen?'selected':''}"><div class="timeline-track"><span class="timeline-node"></span>${i<state.documents.length-1?'<span class="timeline-stem"></span>':''}</div><button class="timeline-item" data-action="select-doc" data-id="${esc(d.id)}"><div class="timeline-item-top"><span class="node-date">${fmt(d.disclosedAt||d.fetchedAt?.slice(0,10))}</span>${pill(type,tone)}</div><div class="timeline-title">${esc(d.summary||d.title)}</div><div class="timeline-sub">${esc(d.title)}</div><div class="timeline-foot"><span class="micro-meta">${d.claims.length} 条核心主张 · ${d.checked?'来源已核对':'来源待核对'}</span><span style="color:#7088b6">${ic('chevron',15)}</span></div></button></div>`}).join(''):`<div class="empty">${ic('timeline',26)}<strong>回放尚未开始</strong>点击下一条证据，查看事件如何从初次筹划逐步演化。</div>`}</div><div style="margin-top:auto;padding-top:12px;border-top:1px solid #edf0f5"><button class="button small" data-action="open-audit">${ic('archive',15)} 查看全部证据处理日志</button></div></div>`;}
function formatAssessment(doc,claim){
 if(!claim)return '';
 // The internal evidence score is deliberately not a user-facing certainty measure.
 const checked=doc.checked===true;
 let verdict,note='';
 if(!checked){
   verdict=claim.kind==='rumor'?'传闻尚未获得独立证实':'材料来源尚未独立核实';
   note='已保留原文，但目前不能据此改写已核验的事件状态。';
 }else if(claim.kind==='opinion'){
   verdict='研究观点，不能作为既成事实';
   note='可参考其论据，不能据此确认实际结果。';
 }else if(claim.kind==='speculation'){
   verdict='条件性预测，尚非已发生事实';
   note='公开材料能证明该预测曾被提出，不能证明它必然实现。';
 }else if(claim.kind==='rumor'){
   verdict='传闻内容尚待独立核验';
   note='被报道不等于已经证实。';
 }else{
   verdict='有原始公开材料支持';
 }
 return `<div class="evidence-assessment ${checked?'verified':'unverified'}"><span class="assessment-kicker">核验结论</span><div class="assessment-head">${ic(checked?'shield':'alert',16)} <strong>${esc(verdict)}</strong></div>${note?`<p>${esc(note)}</p>`:''}</div>`;
}
function originalEvidence(doc,claim){
 if(!claim)return '';
 return `<div class="source-quote"><span class="source-quote-label">原文摘录</span><p>${esc(claim.quote||'缺少可定位的原文片段')}</p></div>`;
}
function evidenceRelationship(doc,claim){if(!claim)return '';if(claim.topic==='termination')return `该材料支持“决定终止”这一当前事实；早期筹划及预案披露属于历史阶段，不构成互相否定。`;
 if(claim.topic==='completion'&&claim.polarity==='refute')return '此材料限制了“已完成交割”的判断；与早期筹划行为不冲突。';
 if(!doc.checked)return '导入内容尚未独立核实，不能仅凭自填来源或重复转载推翻已核实的官方披露。';
 return '目前未识别到可以直接推翻此主张的已核对同条件材料；不等于所有相关观点均已证实。';}
function compareAcrossSources(doc,claim){
 if(!claim)return '';
 const candidates=state.documents.flatMap(d=>d.id===doc.id?[]:d.claims.filter(c=>c.topic===claim.topic&&c.polarity!==claim.polarity).map(c=>({d,c})));
 if(!candidates.length)return '';
 const counterpart=candidates.sort((a,b)=>Number(b.d.checked)-Number(a.d.checked))[0];
 const sameDate=!!doc.disclosedAt && doc.disclosedAt===counterpart.d.disclosedAt;
 const tag=sameDate?'潜在事实冲突':'跨时点差异（需核对）';
 const explanation=sameDate?'双方主张在相同披露日指向相反结论，仍须核对具体截至时点、合同范围及否定条件。':'双方披露日期不同，可能属于进展变化而非直接事实冲突；不能简单二选一。';
 return `<div style="margin-top:11px;border:1px solid #e9edf5;padding:11px;border-radius:9px"><div style="display:flex;justify-content:space-between;align-items:center;gap:5px"><strong style="font-size:11px;color:#4e5c74">跨来源证据对照</strong>${pill(tag,sameDate?'amber':'blue')}</div><div class="split-evidence"><div><div class="small-muted">当前 · ${esc(doc.publisher||'来源未知')}</div>${esc(claim.text)}</div><div><div class="small-muted">对照 · ${esc(counterpart.d.publisher||'来源未知')}</div>${esc(counterpart.c.text)}</div></div><p class="compact-text" style="font-size:10px">${explanation} ${doc.checked!==counterpart.d.checked?'未核实的手动材料不能凭说法明确或转载数量覆盖正式披露。':''}</p></div>`;
}
function inspector(){const d=currentDoc();if(!d)return `<div class="card inspector"><div class="empty"><strong>暂无可查看的证据</strong>从历史回放继续导入第一份披露材料。</div></div>`;const claims=d.claims||[],idx=Math.min(selectedClaim,Math.max(claims.length-1,0)),c=claims[idx];return `<aside class="card inspector"><div class="inspector-header"><div class="inspector-head-row"><span>NODE INSPECTOR · 节点详情</span><span>${d.checked?pill('已核对来源','green'):pill('待核实','amber')}</span></div><h3>${esc(d.summary||d.title)}</h3><div style="display:flex;gap:6px;flex-wrap:wrap">${pill(KIND[d.kind]||'手动材料')}${d.status?pill(STATUS[d.status]||'状态待确认','blue'):''}</div></div><div class="inspector-block"><div class="block-title">${ic('shield',16)} 核心主张与证据核验</div>${claims.length?claims.map((x,i)=>`<button class="claim-card ${i===idx?'selected':''}" style="text-align:left;width:100%" data-action="select-claim" data-index="${i}"><div class="claim-text">${esc(x.text)}</div><div class="claim-meta">${pill(labelType(x.kind),x.kind==='rumor'?'amber':x.kind==='speculation'?'purple':'')}</div></button>`).join(''):'<p class="compact-text">未提取到符合条件的事件核心主张，保留原始文本与处理记录。</p>'}${c?formatAssessment(d,c):''}</div><div class="inspector-block"><div class="block-title">${ic('layers',16)} 证据关系与结论影响</div><p class="compact-text">${esc(c?evidenceRelationship(d,c):'暂无相关主张。')}</p>${c?compareAcrossSources(d,c):''}<div style="height:9px"></div><p class="compact-text"><strong style="color:#3a4a64">本次处理：</strong>${esc(d.impact||(!d.checked?'新证据已保存、主张已分类；暂不覆盖已核实事件状态。':'补充事件历史材料。'))}</p>${d.status==='terminated'?`<div class="callout" style="margin-top:10px">${ic('info',15)} 事件终止是状态演化；历史筹划与披露预案仍然是有效的历史事实。</div>`:''}</div><div class="inspector-block"><div class="block-title">${ic('clock',16)} 四类时间</div><div class="time-grid"><span>事件发生时间</span><span>${d.happenedAt?fmt(d.happenedAt):'未公开 / 需逐项核对'}</span><span>信息披露时间</span><span>${d.disclosedAt?fmt(d.disclosedAt):'未知'}</span><span>系统抓取时间</span><span>${dateTime(d.fetchedAt)}</span><span>系统更新时间</span><span>${dateTime(d.updatedAt)}</span></div><p class="small-muted" style="margin-bottom:0">披露时间用于排序；抓取/更新时间为本浏览器运行产生，不冒充真实历史采集时间。</p></div><div class="inspector-block"><div class="block-title">${ic('file',16)} 原始证据</div><div style="font-size:12px;font-weight:650;line-height:1.7;margin-bottom:5px">${esc(d.title)}</div><div class="small-muted" style="margin-bottom:10px">${esc(d.publisher||'来源未核实')} · ${esc(d.number||'未标注编号')}</div>${c?originalEvidence(d,c):''}${isUrl(d.url)?`<a class="source-link" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer"><span>${ic('external',15)} 查看原始公告 / 报道</span>${ic('arrow',14)}</a>`:'<div class="danger-note">该材料暂无可访问的 HTTPS 原始来源；无法独立核验。</div>'}<button class="inline-link" style="margin-top:11px" data-action="source-text">展开已录入的原始材料正文 ${ic('chevron',12)}</button></div></aside>`;}
function versionsSection(){const v=latestVersion(state);return `<section class="card list-card" style="margin-top:17px"><div class="section-head" style="margin:0 0 13px"><div><h3>结论版本与变更依据</h3><p>只有状态或关键判断发生实质变化才生成重要版本；历史记录不可静默覆盖。</p></div>${pill(`${state.versions.length} 个版本`,'blue')}</div><div class="version-row">${state.versions.map((x,i)=>`<button class="version-button ${activeVersion===i?'selected':''}" data-action="version" data-index="${i}">${esc(x.id.toUpperCase())} · ${esc(x.label)}</button>`).join('')||'<span class="small-muted">暂无版本</span>'}</div>${state.versions.length?(()=>{const vv=state.versions[Math.min(activeVersion,state.versions.length-1)];return `<div class="version-content"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px">${pill(vv.label,vv.status==='terminated'?'red':'blue')} <span class="small-muted">证据截至 ${fmt(vv.disclosedThrough)}</span></div><h4 style="margin-top:11px">${esc(vv.summary)}</h4><div style="margin-top:6px"><strong>版本触发原因：</strong>${esc(vv.reason)}</div><div class="small-muted" style="margin-top:7px">对应材料：${esc(vv.evidenceIds.join(', '))} · 系统版本生成 ${dateTime(vv.generatedAt)}</div></div>`})():`<div class="empty">继续载入经核对的披露材料后，才能生成事件版本。</div>`}</section>`;}
function detailView(){if(!selectedDoc&&state.documents.length){selectedDoc=state.documents.at(-1).id;activeVersion=Math.max(0,state.versions.length-1)}return `<div class="heading"><div><div class="eyebrow">EVENT RESEARCH / EVIDENCE CHAIN</div><h1>事件证据工作台</h1><p>当前结论、证据时间线与节点核验信息在同一页面完整展开。</p></div>${actionToolbar()}</div>${replayBanner()}<div style="height:12px"></div>${topHero()}<div class="section-head"><div><h3>事件证据时间线</h3><p>左侧按披露先后展示事件主线 · 点击节点，右侧同步展开证据详情与四类时间</p></div><button class="button small" data-action="open-about">${ic('sliders',14)} 核验方法</button></div><div class="two-col">${timeline()}${inspector()}</div>${versionsSection()}`;}
function chatView(){const summ=summaryOf(state),isLoaded=state.documents.length>0;return `<div class="chat-shell"><div class="chat-top"><div class="chat-emblem">${ic('sparkles',24)}</div><h1>你好，有什么投资事件值得核验？</h1><p>从一条事件，读懂完整证据链与历史结论变化</p></div><div class="bubble">${esc(chatText)}</div><div class="assistant-reply"><div class="assistant-avatar">${ic('sparkles',17)}</div><div class="assistant-content"><p>${isLoaded?'已找到与问题对应的投资事件。以下结论基于本地已载入的公开历史材料：':'已识别对应的交易主题，但尚无核实资料，当前不生成确定性事件状态。'}</p><div class="card summary-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="eyebrow">EVENT INTELLIGENCE · MERGER & ACQUISITION</span>${pill(summ.label,summ.status==='terminated'?'red':'blue')}</div><h2>${esc(EVENT.name)}</h2><div class="small-muted">${esc(EVENT.tickerFull)} · 收购方 / 事件主体</div><div class="summary-statement">${esc(summ.summary)}</div>${chatLoading?`<div class="small-muted" style="margin:10px 0">正在调用大模型基于证据分析…</div>`:chatAnswer?`<div class="ai-answer"><div style="font-size:12px;font-weight:750;color:#305a99;margin-bottom:6px">AI 基于已录入证据的回答</div><div>${esc(chatAnswer.answer)}</div>${chatAnswer.citations.length?`<div class="small-muted" style="margin-top:8px">引用：${chatAnswer.citations.map(id=>{const d=state.documents.find(x=>x.id===id);return d?esc(d.title):esc(id)}).join('；')}</div>`:''}${chatAnswer.limitations?`<div class="small-muted" style="margin-top:6px">${esc(chatAnswer.limitations)}</div>`:''}</div>`:''}<div style="display:flex;align-items:center;gap:7px;color:#78889d;font-size:11px">${ic('shield',15)} ${isLoaded?'依据可追溯到原始公告与披露时间':'无已核对证据，不生成确定性结论'}</div><div class="summary-actions"><span class="small-muted">${state.documents.length} 份材料 · ${state.versions.length} 个重要结论版本</span><button class="button primary" data-action="navigate" data-to="detail">查看完整证据链 ${ic('arrow',15)}</button></div></div></div></div><form class="chat-input" id="chat-form"><input id="chat-question" aria-label="事件问题" placeholder="输入事件、公司名称或代码…" value="${esc(chatText)}"/><button type="submit" aria-label="提交问题">${ic('arrow',18)}</button></form><p style="text-align:center;color:#a5b0bf;font-size:10px;margin-top:9px">MVP 聚焦双成药业与奥拉股份这一个可核实事件，不冒充全市场问答搜索。</p></div>`;}
function watchView(){return `<div class="heading"><div><div class="eyebrow">FOLLOWING / MY EVENTS</div><h1>我的关注</h1><p>聚焦具体投资事件，而不是泛化的股票新闻推送。</p></div><button class="button" data-action="navigate" data-to="detail">${ic('timeline',15)} 事件工作台</button></div><div class="card list-card"><div style="display:flex;align-items:center;justify-content:space-between;gap:15px"><div><h3 style="margin:0 0 6px">${esc(EVENT.name)}</h3><div class="small-muted">双成药业 002693 · ${state.documents.length} 份关联证据 · ${latestVersion(state)?.label||'状态待确认'}</div></div><button class="button ${state.watching?'secondary':'primary'}" data-action="watch">${ic('bookmark',15)} ${state.watching?'取消关注':'关注该事件'}</button></div><p class="compact-text" style="margin-top:15px">关注后，在历史回放或新证据引发重要结论变化时，系统会保存站内通知。数据保留于当前浏览器；尚未提供跨设备账户同步或实时后台监控。</p></div></div>`;}
function notificationView(){return `<div class="heading"><div><div class="eyebrow">EVENT UPDATES / NOTIFICATIONS</div><h1>动态通知</h1><p>重大变化才生成提醒；重复转载不发送重复消息。</p></div><button class="button" data-action="mark-read">${ic('check',15)} 全部标记已读</button></div><div class="card list-card">${state.notifications.length?state.notifications.map(n=>`<div class="notice ${!n.read?'unread':''}" data-action="notification" data-id="${esc(n.id)}"><div style="color:#4974c8;margin-top:2px">${ic('bell',18)}</div><div style="flex:1"><div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap"><h4>${esc(n.title)}</h4>${pill(n.importance==='major'?'重大变化':'进展更新',n.importance==='major'?'red':'blue')}</div><p>${esc(n.body)}</p><p style="margin-top:6px">${dateTime(n.at)} · 点击查看历史结论版本</p></div>${ic('chevron',15)}</div>`).join(''):`<div class="empty">${ic('bell',25)}<strong>暂无事件变化通知</strong>先关注该事件，再使用历史回放按顺序输入新公告，即可验证状态更新和提醒生成。</div>`}<div style="text-align:right;margin-top:15px"><button class="button small" data-action="navigate" data-to="detail">回到证据时间线 ${ic('arrow',14)}</button></div></div>`;}
function drawDrawer(){let body='',title='',footer='';if(drawer==='import'){
 title='导入新证据';body=`<div class="danger-note" style="margin-bottom:19px">手动填写的“公司公告”不会被自动视为真实官方公告。材料先经过事件匹配、主张抽取和来源提示，再决定是否影响已核验结论。</div><form id="import-form"><div class="form-field"><label for="e-title">材料标题 *</label><input id="e-title" maxlength="130" required placeholder="例如：双成药业奥拉股份交易后续说明"/></div><div class="form-grid"><div class="form-field"><label for="e-kind">来源类型</label><select id="e-kind"><option value="media">财经新闻</option><option value="official">公司公告（待核验）</option><option value="research">研究观点</option><option value="social">市场消息 / 传闻</option><option value="manual">其他材料</option></select></div><div class="form-field"><label for="e-date">披露时间</label><input id="e-date" type="date"/></div></div><div class="form-grid"><div class="form-field"><label for="e-happened">事件发生时间</label><input id="e-happened" type="date"/></div><div class="form-field"><label for="e-publisher">发布者</label><input id="e-publisher" maxlength="100" placeholder="发布机构或媒体"/></div></div><div class="form-field"><label for="e-url">原文链接（HTTPS）</label><input id="e-url" type="url" placeholder="https://..."/><p class="hint">仅记录来源链接，不绕过站点访问限制，也不自动声称已验证网页内容。</p></div><div class="form-field"><label for="e-text">材料原文 *</label><textarea id="e-text" required maxlength="15000" placeholder="粘贴可追溯的材料正文。系统会提取主张、初步分类，并判断是否属于同一事件。"></textarea></div><p class="hint">部署环境配置 OPENAI_API_KEY 后使用真实大模型抽取主张；未配置或调用失败时明确提示并使用本地规则。API 密钥不在网页中输入。</p></form>`;
 footer=`<button class="button" data-action="close-drawer">取消</button><button class="button primary" data-action="submit-evidence" id="submit-evidence">${ic('plus',14)} 导入并核验</button>`;
 }else if(drawer==='audit'){
 title='系统处理与审计日志';body=`<div style="margin-bottom:16px">${pill(`${state.logs.length} 条日志`)} ${pill(`${state.pending.length} 条待确认匹配`,'amber')}</div>${state.pending.length?`<div class="danger-note" style="margin-bottom:17px"><strong>待审核匹配</strong><br/>${state.pending.map(p=>`${esc(p.title)}：${esc(p.reason)}`).join('<br/>')}</div>`:''}${state.logs.map(l=>`<div class="log-entry"><strong>${esc(l.message)}</strong><span>${dateTime(l.at)} · ${esc(l.kind)}</span></div>`).join('')}`;
 footer=`<button class="button" data-action="close-drawer">关闭</button>`;
 }else if(drawer==='about'){
 title='证据分类与核验原则';body=`<div class="eyebrow">STEP 3 & 4</div><h3 style="margin:9px 0 12px">每条结论都要能追溯</h3><p class="compact-text">系统区分事实性主张、观点、推测和传闻。这四类描述的是信息性质，不是天然可信度等级。</p><div class="danger-note" style="margin-top:16px">只对具体主张做核验：优先核对原始公开资料，比较是否同一事项和时点；转载不算独立证实，观点与预测不当作既成事实。未核实的用户材料不能覆盖已核对的官方披露。</div><p class="compact-text" style="margin-top:15px">界面只展示简明核验结论与可点击的原始证据；内部评估不在此展示数值；请直接通过原始材料核验结论。</p>`;
 footer=`<button class="button" data-action="close-drawer">明白了</button>`;
 }else if(drawer==='replay'){
 title='历史披露顺序回放';body=`<div class="danger-note">重新回放会重置当前浏览器内的事件材料、结论版本、通知和操作日志，并保留“关注事件”的开关。建议先演示当前数据，再开始回放。</div><h3 style="font-size:15px;margin:20px 0 10px">回放顺序</h3>${CURATED_DOCS.map((d,i)=>`<div class="log-entry"><strong>${i+1}. ${esc(d.title)}</strong><span>${fmt(d.disclosedAt)} · ${esc(d.publisher)}</span></div>`).join('')}<p class="compact-text">点击开始后，网页将清空事件历史，并在每次点击“导入下一条”时真实运行文档接入、主张核验、状态比较、版本生成和关注通知流程。</p>`;
 footer=`<button class="button" data-action="close-drawer">取消</button><button class="button primary" data-action="confirm-replay">开始历史回放 ${ic('arrow',14)}</button>`;
 }else if(drawer==='source'){
 const d=currentDoc();title='已录入的材料正文';body=d?`<div class="eyebrow">${esc(d.title)}</div><p class="compact-text" style="white-space:pre-wrap;margin-top:15px">${esc(d.text)}</p>${d.aiMeta?`<p class="compact-text"><strong>大模型处理：</strong>${esc(d.aiMeta.model)} · ${dateTime(d.aiMeta.analyzedAt)} · 引用原文已校验</p>`:''}<div class="danger-note" style="margin-top:17px">${d.checked?'此处为用于分析的简化、来源可核对文本，并非替代完整公告 PDF；请点击原始链接核验原文。':'此内容来自用户手动输入，真实性尚未独立验证。'}</div>${isUrl(d.url)?`<p><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">打开外部原始材料 ↗</a></p>`:''}`:'';
 footer=`<button class="button" data-action="close-drawer">关闭</button>`;
 }
 return `<div class="panel-backdrop" id="backdrop"><div class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="drawer-header"><h2>${esc(title)}</h2><button class="icon-button" data-action="close-drawer" aria-label="关闭">${ic('close',16)}</button></div><div class="drawer-body">${body}</div><div class="drawer-footer">${footer}</div></div></div>`;
}
function render(){const inner=view==='chat'?chatView():view==='detail'?detailView():view==='watch'?watchView():notificationView();document.querySelector('#app').innerHTML=chrome(inner);}
async function submitEvidence(){const field=x=>document.getElementById(x)?.value||'';const title=field('e-title').trim(),text=field('e-text').trim();if(!title||!text){alertUser('请填写材料标题和正文。');return;}const url=field('e-url').trim();if(url&&!isUrl(url)){alertUser('请使用 HTTPS 原文链接。');return;}
 const doc={title,text,kind:field('e-kind'),publisher:field('e-publisher')||'来源待核实',source:'用户导入 · 待核实',disclosedAt:field('e-date')||null,happenedAt:field('e-happened')||null,url,summary:title,impact:'材料进入核验流程，未独立核实的内容不能直接改变已确认状态。'};
 const submit=document.getElementById('submit-evidence');if(submit){submit.disabled=true;submit.textContent='正在抽取与核验…';}
 try{
  let used='rules',reason='';
  if(aiStatus.configured&&['http:','https:'].includes(location.protocol)){
   let timer;
   try{
    const controller=new AbortController();timer=setTimeout(()=>controller.abort(),25000);
    const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,title,kind:doc.kind,disclosedAt:doc.disclosedAt}),signal:controller.signal});
    const raw=await res.json();
    if(!res.ok)throw new Error(raw.error||`HTTP ${res.status}`);
    if(raw.mode==='llm'&&Array.isArray(raw.claims)){
      doc.aiClaims=raw.claims;
      doc.aiMeta={model:raw.model,eventMatchHint:raw.eventMatchHint,explanation:raw.explanation,validation:raw.validation,analyzedAt:new Date().toISOString()};
      used='llm';
    }else throw new Error('模型没有返回有效的结构化结果');
   }catch(e){reason=e.message||'调用失败';}
   finally{clearTimeout(timer);}
  }else reason='服务端 API 未配置';
  const result=addEvidence(state,doc);aiMode=used;selectedDoc=result.document?.id||selectedDoc;selectedClaim=0;drawer=null;view='detail';update(result.state);
  alertUser(result.decision==='merge'?`材料已接入：${result.document?.claims.length||0} 条主张 · ${used==='llm'?'真实大模型提取':'规则提取（'+reason+'）'} · 来源待核实`:
    result.decision==='duplicate'?'检测到重复材料，未重复入库':`已标记${result.decision==='review'?'待审核':'新事件'}，不会强行合并：${result.reason}`);
 }catch(e){if(submit){submit.disabled=false;submit.textContent='导入并核验';}try{state.logs.unshift({id:'error-'+Date.now(),kind:'error',message:'材料处理失败：'+(e.message||'未知错误'),at:new Date().toISOString(),metadata:{}});persist();}catch(_){}alertUser('处理失败：'+(e.message||'未知错误'));}
}
async function probeAI(){
 if(!['http:','https:'].includes(location.protocol))return;
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
 try{const res=await fetch('/api/status',{signal:controller.signal,cache:'no-store'});if(!res.ok)throw new Error('API probe failed');const data=await res.json();aiStatus={configured:data.configured===true,checked:true,model:data.model||null};}
 catch{aiStatus={configured:false,checked:true,model:null};}
 finally{clearTimeout(timeout);render();}
}
async function runChatAnalysis(question){
 chatAnswer=null;chatLoading=false;
 if(!aiStatus.configured){render();alertUser('大模型 API 尚未配置，当前展示已核对的结构化事件结论。');return;}
 chatLoading=true;render();let timeout;
 try{
  const controller=new AbortController();timeout=setTimeout(()=>controller.abort(),25000);
  const evidence=state.documents.map(d=>({id:d.id,title:d.title,text:d.text,checked:d.checked,disclosedAt:d.disclosedAt}));
  const res=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({question,evidence})});
  const data=await res.json();if(!res.ok||data.mode!=='llm')throw new Error(data.error||`HTTP ${res.status}`);
  chatAnswer={answer:data.answer,citations:data.citations||[],limitations:data.limitations||''};aiMode='llm';
 }catch(e){chatAnswer=null;alertUser('大模型调用失败，已保留公告支持的原有结论：'+(e.message||'服务异常'));}
 finally{clearTimeout(timeout);chatLoading=false;render();}
}
function onClick(event){const target=event.target.closest('[data-action]');if(!target)return;const act=target.dataset.action;
 if(act==='navigate'){view=target.dataset.to;drawer=null;selectedDoc=null;render();window.scrollTo({top:0,behavior:'instant'});return;}
 if(act==='watch'){update(toggleWatch(state));alertUser(state.watching?'已关注此投资事件。':'已取消关注。');return;}
 if(act==='select-doc'){selectedDoc=target.dataset.id;selectedClaim=0;render();return;}
 if(act==='select-claim'){selectedClaim=Number(target.dataset.index)||0;render();return;}
 if(act==='version'){activeVersion=Number(target.dataset.index)||0;render();return;}
 if(act==='open-import'){drawer='import';render();return;}
 if(act==='open-audit'){drawer='audit';render();return;}
 if(act==='open-about'){drawer='about';render();return;}
 if(act==='open-replay'){drawer='replay';render();return;}
 if(act==='source-text'){drawer='source';render();return;}
 if(act==='close-drawer'){drawer=null;render();return;}
 if(act==='confirm-replay'){drawer=null;selectedDoc=null;selectedClaim=0;activeVersion=0;view='detail';update(beginReplay(state));alertUser('历史回放已开始。点击“导入下一条”观察真实处理链路。');return;}
 if(act==='replay-next'){const r=replayNext(state);selectedDoc=r.result?.document?.id||selectedDoc;activeVersion=Math.max(0,r.state.versions.length-1);update(r.state);alertUser(r.done?'已完成历史回放，事件与通知已更新。':`第 ${r.state.replay.next} 条材料处理完成。`);return;}
 if(act==='submit-evidence'){submitEvidence();return;}
 if(act==='mark-read'){update(markNotificationsRead(state));return;}
 if(act==='notification'){const n=state.notifications.find(x=>x.id===target.dataset.id);if(n){n.read=true;persist();view='detail';drawer=null;activeVersion=Math.max(0,state.versions.findIndex(v=>v.id===state.changes.find(c=>c.id===n.changeId)?.to));selectedDoc=state.documents.at(-1)?.id;render();window.scrollTo({top:0,behavior:'instant'});}return;}
}
document.addEventListener('click',e=>{if(e.target?.id==='backdrop'){drawer=null;render();return;}onClick(e)});
document.addEventListener('submit',e=>{if(e.target?.id==='chat-form'){e.preventDefault();const q=document.getElementById('chat-question')?.value?.trim()||'';chatText=q||chatText;if(/(奥拉|双成|002693|并购|重组)/.test(q)){runChatAnalysis(q);}else{alertUser('本 MVP 目前只覆盖“双成药业收购奥拉股份”案例，其他事件请待后续接入。');}}else if(e.target?.id==='import-form'){e.preventDefault();submitEvidence();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer){drawer=null;render();}});
render();
probeAI();
