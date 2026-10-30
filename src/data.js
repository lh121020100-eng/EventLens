// Curated, public-source-backed event snapshots. Human-written summaries are NOT verbatim quotes.
// The hyperlinks point to the publisher copies and allow independent inspection.
export const EVENT = {
  id: 'evt-shuangcheng-aura-2024', name:'双成药业收购奥拉股份',
  company:'海南双成药业股份有限公司', target:'宁波奥拉半导体股份有限公司',
  ticker:'002693', tickerFull:'002693.SZ', sector:'并购重组',
  aliases:['双成药业','海南双成药业','奥拉股份','宁波奥拉半导体'],
  important:'公司终止了拟购买奥拉股份100%股份的重大资产重组。',
  impact:'原拟通过重组切入半导体业务，交易终止意味着此次资产注入计划未实施。',
  caveat:'行情波动与公告同日发生不等于所有涨跌均由该事件引起；不构成买卖建议。',
};
export const CURATED_DOCS = [
  {
    id:'doc-20240828', eventId: EVENT.id, kind:'official', source:'公司公告 / 巨潮资讯', publisher:'海南双成药业股份有限公司',
    title:'关于筹划重大资产重组暨关联交易的停牌公告', number:'2024-052',
    disclosedAt:'2024-08-28', happenedAt:'2024-08-28',
    url:'https://static.cninfo.com.cn/finalpage/2024-08-28/1221008773.PDF',
    text:'海南双成药业股份有限公司拟通过重大资产置换、发行股份及支付现金的方式购买宁波奥拉半导体股份有限公司股权，同时拟向不超过35名特定投资者发行股份募集配套资金。因有关事项尚存在不确定性，公司股票自2024年8月28日开市起停牌。',
    summary:'公司首次披露筹划收购奥拉股份，股票停牌。',
    claims:[{text:'公司正在筹划收购奥拉股份股权。',quote:'拟通过重大资产置换、发行股份及支付现金的方式购买宁波奥拉半导体股份有限公司股权',kind:'fact',topic:'planning',polarity:'support'},{text:'交易仍存在不确定性。',quote:'有关事项尚存在不确定性',kind:'fact',topic:'risk',polarity:'support'}],
    status:'planning',impact:'建立事件档案，形成筹划中的初始结论。',
    provenance:'curated',checked:true,originGroup:'cninfo-2024-052'
  },
  {
    id:'doc-20240911', eventId: EVENT.id, kind:'official', source:'公司公告 / 巨潮资讯', publisher:'海南双成药业股份有限公司',
    title:'发行股份及支付现金购买资产并募集配套资金暨关联交易预案',number:'2024年9月重组预案',
    disclosedAt:'2024-09-11', happenedAt:null,
    url:'https://static.cninfo.com.cn/finalpage/2024-09-11/1221192289.PDF',
    text:'海南双成药业股份有限公司拟以发行股份及支付现金的方式向奥拉投资、Win Aiming等25名交易对方购买其持有的宁波奥拉半导体股份有限公司100%股份，并拟向不超过35名特定投资者发行股份募集配套资金。本次交易尚需履行有关决策、审批程序，存在不确定性。',
    summary:'重大资产重组预案披露，拟购买奥拉股份100%股份。',
    claims:[{text:'公司披露拟购买奥拉股份100%股份的预案。',quote:'购买其持有的宁波奥拉半导体股份有限公司100%股份',kind:'fact',topic:'proposal',polarity:'support'},{text:'交易尚需履行有关决策、审批程序。',quote:'尚需履行有关决策、审批程序',kind:'fact',topic:'completion',polarity:'refute'}],
    status:'proposal',impact:'事件从筹划转为预案披露；仍不等于交割完成。',
    provenance:'curated',checked:true,originGroup:'cninfo-2024-09'
  },
  {
    id:'doc-20250311', eventId: EVENT.id,kind:'official',source:'公司公告 / 巨潮资讯',publisher:'海南双成药业股份有限公司',
    title:'关于终止发行股份及支付现金购买资产并募集配套资金暨关联交易事项的公告',number:'2025-009',
    disclosedAt:'2025-03-11',happenedAt:null,
    url:'https://notice.10jqka.com.cn/api/pdf/eb59226efbc42e63.pdf',
    text:'公司原拟以发行股份及支付现金的方式向奥拉投资、Win Aiming等25名交易对方购买宁波奥拉半导体股份有限公司100%股份。由于各交易对方取得标的公司股权的时间和成本差异较大，交易各方对本次交易的预期不一，尽管公司与交易对方进行了多轮磋商谈判，但公司与部分交易对方仍未能就交易对价等商业条款达成一致意见。因此，公司决定终止发行股份及支付现金购买资产并募集配套资金暨关联交易事项。',
    summary:'公司正式终止重大资产重组，交易对价等商业条款未达成一致。',
    claims:[{text:'公司决定终止收购奥拉股份的重大资产重组。',quote:'公司决定终止发行股份及支付现金购买资产并募集配套资金暨关联交易事项',kind:'fact',topic:'termination',polarity:'support'},{text:'部分交易对方未能就交易对价等商业条款达成一致。',quote:'仍未能就交易对价等商业条款达成一致意见',kind:'fact',topic:'reason',polarity:'support'}],
    status:'terminated',impact:'交易从预案披露/推进阶段转为已终止，属于重大业务状态变化，而非对早期筹划事实的否认。',
    provenance:'curated',checked:true,originGroup:'cninfo-2025-009'
  },
  {
    id:'doc-20250311-media',eventId:EVENT.id,kind:'media',source:'第一财经 / 新浪财经转载',publisher:'第一财经',
    title:'终止跨界并购重组事宜，双成药业开盘跌停',number:'市场反应报道',
    disclosedAt:'2025-03-11',happenedAt:'2025-03-11',
    url:'https://finance.sina.com.cn/roll/2025-03-11/doc-inepfvkt5710760.shtml',
    text:'2025年3月11日，双成药业终止跨界并购重组的消息披露后开盘跌停。报道提及双成药业此前拟收购奥拉股份100%股份。',
    summary:'新闻报道终止公告发布后，当日股票开盘跌停。',
    claims:[{text:'2025年3月11日，双成药业股票开盘跌停。',quote:'开盘跌停',kind:'fact',topic:'market',polarity:'support'}],
    status:null,impact:'记录已观察到的市场表现；不将股价表现全部归因于该事件。',
    provenance:'curated',checked:true,originGroup:'yicai-2025-03-11'
  }
];
export const STATUS = {unknown:'待确认',planning:'筹划中',proposal:'预案已披露',approving:'审批中',signed:'已签约',completed:'已完成',paused:'暂停中',terminated:'已终止'};
export const STATUS_ORDER = ['unknown','planning','proposal','approving','signed','completed'];
export const KIND = {official:'公司公告',media:'财经新闻',research:'研究观点',social:'市场消息',manual:'手动材料'};
export const CLAIM_KIND = {fact:'事实性主张',opinion:'观点',speculation:'推测',rumor:'传闻'};
