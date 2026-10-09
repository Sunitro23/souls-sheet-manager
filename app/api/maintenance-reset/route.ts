import {env} from 'cloudflare:workers';
// Temporary, owner-authorized operation. Removed after the requested reset.
export async function POST(req:Request){
 const config=env as unknown as {CENDRES_RESET_TOKEN?:string;CENDRES_RESET_EXPIRES?:string;DB:D1Database};
 const secret=config.CENDRES_RESET_TOKEN,expires=Number(config.CENDRES_RESET_EXPIRES);
 if(!secret||!expires||Date.now()>expires)return new Response(null,{status:404});
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const a=await digest(token),b=await digest(secret);let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i];
 if(different)return new Response(null,{status:403});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403});
 const body=await req.text();if(body!=='DELETE_CAMPAIGNS_AND_CHARACTERS_KEEP_ACCOUNTS')return new Response(null,{status:400});
 const results=await config.DB.batch<Record<string,number>>([
  config.DB.prepare('SELECT COUNT(*) AS accounts FROM accounts'),
  config.DB.prepare('SELECT COUNT(*) AS campaigns FROM campaigns'),
  config.DB.prepare('SELECT COUNT(*) AS characters FROM characters'),
  config.DB.prepare('DELETE FROM campaign_members'),
  config.DB.prepare('DELETE FROM characters'),
  config.DB.prepare('DELETE FROM campaigns'),
  config.DB.prepare('SELECT COUNT(*) AS accounts FROM accounts'),
  config.DB.prepare('SELECT COUNT(*) AS campaigns FROM campaigns'),
  config.DB.prepare('SELECT COUNT(*) AS characters FROM characters')
 ]);
 return Response.json({before:{...results[0].results[0],...results[1].results[0],...results[2].results[0]},after:{...results[6].results[0],...results[7].results[0],...results[8].results[0]}},{headers:{'Cache-Control':'no-store'}});
}
