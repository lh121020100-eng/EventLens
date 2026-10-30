import {configured,MODEL,reply} from './_openai.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return reply(405,{error:'Method Not Allowed'});
 return reply(200,{provider:'openai',configured:configured(),model:configured()?MODEL():null,liveVerified:false,
   note:configured()?'服务端已检测到 API 配置；是否可调用将由实际分析结果确认。':'尚未配置服务端 OPENAI_API_KEY；当前只支持规则分析。'});
}
