/** Server-side OpenAI client. Browser code never receives the API key. */
export const MODEL=()=>process.env.OPENAI_MODEL||'gpt-4.1-mini';
export const configured=()=>Boolean(process.env.OPENAI_API_KEY?.trim());
export const jsonHeaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export const reply=(code,body)=>({statusCode:code,headers:jsonHeaders,body:JSON.stringify(body)});
export function parseBody(event,maxBytes=42000){
 if ((event.body||'').length>maxBytes)throw new Error('Payload too large');
 try { const data=JSON.parse(event.body||'{}');if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid JSON object');return data; }
 catch {throw new Error('Invalid JSON');}
}
export async function structuredChat({name,schema,instructions,user,maxTokens=1700}){
 if(!configured())throw Object.assign(new Error('OpenAI API key not configured'),{status:503});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),24000);
 try{
  const response=await fetch('https://api.openai.com/v1/chat/completions',{
   method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:MODEL(),temperature:0,response_format:{type:'json_schema',json_schema:{name,strict:true,schema}},messages:[{role:'system',content:instructions},{role:'user',content:user}],max_completion_tokens:maxTokens})
  });
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error(`Model provider error (${response.status})`),{status:502});
  const message=data?.choices?.[0]?.message;
  if(message?.refusal)throw Object.assign(new Error('Model refused to process this input'),{status:422});
  if(!message?.content||data?.choices?.[0]?.finish_reason==='length')throw new Error('Incomplete model response');
  return {data:JSON.parse(message.content),model:data?.model||MODEL()};
 } finally{clearTimeout(timeout);}
}
