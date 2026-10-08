import { getDb } from '../../../db';
import { accounts,sessions,campaignMembers,campaigns,characters,loginAttempts } from '../../../db/schema';
import { eq,and,gt,or,sql } from 'drizzle-orm';
import { createCharacter,validate,normalizeStored } from '../../../lib/rules';
import {defaultTree,validateTree,remaining,unlock,migrateProgress} from '../../../lib/progression';
const bytes=(s:string)=>new TextEncoder().encode(s);
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const hash=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',bytes(s)));
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',bytes(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000},key,256));}
const fail=(message:string,status=400)=>Object.assign(Error(message),{status});
const cookie=(v:string,age:number)=>`cendres_session=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const respond=(data:any,headers:Record<string,string>={})=>Response.json(data,{headers:{'Cache-Control':'no-store',...headers}});
function image(v:unknown){if(typeof v!=='string'||v.length>600000||v&&!/^https:\/\/[^\s]+$|^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v))throw fail('Image invalide (URL HTTPS ou image de moins de 450 Ko).');return v;}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw fail('Origine non autorisée.',403);
 const raw=await req.text();if(raw.length>2000000)throw fail('Données trop volumineuses.',413);const b=JSON.parse(raw),db=getDb(),now=Date.now();
 const sessionToken=req.headers.get('cookie')?.match(/(?:^|;\s*)cendres_session=([^;]+)/)?.[1]??'';
 const [session]=sessionToken?await db.select().from(sessions).where(and(eq(sessions.id,await hash(sessionToken)),gt(sessions.expires,now))):[];
 const [user]=session?await db.select({id:accounts.id,username:accounts.username}).from(accounts).where(eq(accounts.id,session.accountId)):[];
 if(b.op==='me')return respond({user:user??null});
 if(b.op==='register'||b.op==='login'){
 const username=String(b.username??'').trim().toLowerCase(),password=b.password;
 if(!/^[a-z0-9_-]{3,32}$/.test(username)||typeof password!=='string'||password.length<8||password.length>128)throw fail('Pseudo : 3–32 lettres, chiffres, _ ou -. Mot de passe : 8–128 caractères.');
 const rateId=await hash(`${req.headers.get('cf-connecting-ip')??'unknown'}:${username}`);
 await db.insert(loginAttempts).values({id:rateId,count:1,expires:now+900000}).onConflictDoUpdate({target:loginAttempts.id,set:{count:sql`CASE WHEN ${loginAttempts.expires} < ${now} THEN 1 ELSE ${loginAttempts.count} + 1 END`,expires:sql`CASE WHEN ${loginAttempts.expires} < ${now} THEN ${now+900000} ELSE ${loginAttempts.expires} END`}});
 const [rate]=await db.select().from(loginAttempts).where(eq(loginAttempts.id,rateId));if(rate.count>10)throw fail('Trop de tentatives. Réessayez dans 15 minutes.',429);
 let [account]=await db.select().from(accounts).where(eq(accounts.username,username));
 if(b.op==='register'){if(account)throw fail('Ce pseudo est déjà utilisé.');const salt=crypto.randomUUID();account={id:crypto.randomUUID(),username,salt,passwordHash:await passwordHash(password,salt)};await db.insert(accounts).values(account);}
 else {const candidate=await passwordHash(password,account?.salt??'unknown');if(!account||candidate!==account.passwordHash)throw fail('Pseudo ou mot de passe incorrect.',401);}
 const token=crypto.randomUUID()+crypto.randomUUID();await db.insert(sessions).values({id:await hash(token),accountId:account.id,expires:now+30*86400000});await db.delete(loginAttempts).where(eq(loginAttempts.id,rateId));return respond({user:{id:account.id,username:account.username}},{'Set-Cookie':cookie(token,30*86400)});
 }
 if(!user)throw fail('Connectez-vous pour continuer.',401);
 if(b.op==='logout'){await db.delete(sessions).where(eq(sessions.id,await hash(sessionToken)));return respond({ok:true},{'Set-Cookie':cookie('',0)});}
 if(b.op==='claim'){
 for(const access of (Array.isArray(b.campaigns)?b.campaigns:[]).slice(0,100)){const [c]=await db.select().from(campaigns).where(eq(campaigns.id,String(access.id)));if(c&&!c.gmId&&c.tokenHash===await hash(String(access.token)))await db.update(campaigns).set({gmId:user.id}).where(and(eq(campaigns.id,c.id),sql`${campaigns.gmId} IS NULL`));}
 for(const access of (Array.isArray(b.characters)?b.characters:[]).slice(0,100)){const [c]=await db.select().from(characters).where(eq(characters.id,String(access.id)));if(c&&!c.playerId&&c.tokenHash===await hash(String(access.token))){await db.update(characters).set({playerId:user.id}).where(and(eq(characters.id,c.id),sql`${characters.playerId} IS NULL`));if(c.campaignId)await db.insert(campaignMembers).values({id:`${c.campaignId}:${user.id}`,campaignId:c.campaignId,accountId:user.id}).onConflictDoNothing();}}
 return respond({ok:true});}
 if(b.op==='campaigns'){const member=await db.select().from(campaignMembers).where(eq(campaignMembers.accountId,user.id));const ids=member.map(x=>x.campaignId);const rows=await db.select().from(campaigns).where(or(eq(campaigns.gmId,user.id),...ids.map(id=>eq(campaigns.id,id))));return respond({campaigns:rows.map(c=>({id:c.id,name:c.name,img:c.img,isGM:c.gmId===user.id}))});}
 if(b.op==='createCampaign'){if(typeof b.name!=='string'||!b.name.trim())throw fail('Nom requis.');const id=crypto.randomUUID();await db.insert(campaigns).values({id,name:b.name.trim().slice(0,100),tokenHash:await hash(crypto.randomUUID()),gmId:user.id,tree:JSON.stringify(defaultTree())});return respond({id});}
 const [campaign]=await db.select().from(campaigns).where(eq(campaigns.id,String(b.campaignId??'')));if(!campaign)throw fail('Campagne introuvable.',404);
 const gm=campaign.gmId===user.id;const [member]=await db.select().from(campaignMembers).where(eq(campaignMembers.id,`${campaign.id}:${user.id}`));if(!gm&&!member)throw fail('Vous ne faites pas partie de cette campagne.',403);
 const tree=campaign.tree?JSON.parse(campaign.tree):defaultTree();
 if(b.op==='campaign'){
 const rows=await db.select().from(characters).where(gm?eq(characters.campaignId,campaign.id):and(eq(characters.campaignId,campaign.id),eq(characters.playerId,user.id)));
 const members=gm?await db.select({id:accounts.id,username:accounts.username}).from(campaignMembers).innerJoin(accounts,eq(accounts.id,campaignMembers.accountId)).where(eq(campaignMembers.campaignId,campaign.id)):[];
 return respond({campaign:{id:campaign.id,name:campaign.name,img:campaign.img,revision:campaign.revision,isGM:gm},tree,members,characters:rows.map(r=>({...migrateProgress(normalizeStored(JSON.parse(r.data))),playerId:r.playerId}))});}
 if(b.op==='addPlayer'){if(!gm)throw fail('Accès GM requis.',403);const [p]=await db.select().from(accounts).where(eq(accounts.username,String(b.username).trim().toLowerCase()));if(!p)throw fail('Ce pseudo n’existe pas. Le joueur doit d’abord créer son compte.');await db.insert(campaignMembers).values({id:`${campaign.id}:${p.id}`,campaignId:campaign.id,accountId:p.id}).onConflictDoNothing();return respond({ok:true});}
 if(b.op==='saveCampaign'){if(!gm)throw fail('Accès GM requis.',403);const t=validateTree(b.tree);if(typeof b.name!=='string'||!b.name.trim())throw fail('Nom requis.');const result=await db.update(campaigns).set({name:b.name.trim().slice(0,100),img:image(b.img??''),tree:JSON.stringify(t),revision:campaign.revision+1}).where(and(eq(campaigns.id,campaign.id),eq(campaigns.revision,b.revision))).returning({id:campaigns.id});if(!result.length)throw fail('Campagne modifiée ailleurs. Rechargez avant de réessayer.',409);return respond({ok:true});}
 if(b.op==='createCharacter'){
 let playerId=user.id;if(gm&&b.playerId){const [p]=await db.select().from(campaignMembers).where(eq(campaignMembers.id,`${campaign.id}:${b.playerId}`));if(!p&&b.playerId!==user.id)throw fail('Joueur absent de la campagne.');playerId=b.playerId;}
 const c:any=createCharacter({name:String(b.name??''),level:1,stats:{FOR:10,DEX:10,CON:10,INT:10,SAG:10,CHA:10},magic:'SAG'});Object.assign(c,{campaignId:campaign.id,className:String(b.className??'').slice(0,100),race:String(b.race??'').slice(0,100),unlocks:[]});await db.insert(characters).values({id:c.id,playerId,campaignId:campaign.id,tokenHash:await hash(crypto.randomUUID()),data:JSON.stringify(c),revision:0});return respond({character:c});}
 const [row]=await db.select().from(characters).where(and(eq(characters.id,String(b.id??'')),eq(characters.campaignId,campaign.id)));if(!row||(!gm&&row.playerId!==user.id))throw fail('Personnage inaccessible.',403);
 if(b.op==='assignPlayer'){if(!gm)throw fail('Accès GM requis.',403);const [p]=await db.select().from(campaignMembers).where(eq(campaignMembers.id,`${campaign.id}:${b.playerId}`));if(!p&&b.playerId!==user.id)throw fail('Joueur absent de la campagne.');const updated=await db.update(characters).set({playerId:b.playerId,revision:row.revision+1,data:JSON.stringify({...JSON.parse(row.data),revision:row.revision+1})}).where(and(eq(characters.id,row.id),eq(characters.revision,b.revision))).returning({id:characters.id});if(!updated.length)throw fail('Personnage modifié ailleurs. Rechargez.',409);return respond({ok:true});}
 const old:any=migrateProgress(normalizeStored(JSON.parse(row.data)));if(b.revision!==row.revision)throw fail('Personnage modifié ailleurs. Rechargez avant de réessayer.',409);
 let c:any;
 if(b.op==='unlock')c=unlock(old,tree,b.nodeId);
 else if(b.op==='saveCharacter'){
 const proposed={...b.character,id:old.id,campaignId:old.campaignId,unlocks:old.unlocks??[]};
 if(!gm){for(const k of ['hpBonus','hpMalus','manaBonus','manaMalus','bonus','malus'])if((proposed[k]??0)!==(old[k]??0))throw fail('Le GM gère les ajustements de caractéristiques.',403);if(proposed.level!==old.level||proposed.className!==old.className||proposed.race!==old.race||JSON.stringify(proposed.stats)!==JSON.stringify(old.stats))throw fail('Le GM gère le niveau, la classe, la race et les caractéristiques.',403);}
 c=validate(proposed,old,gm);c.className=String(proposed.className??'').slice(0,100);c.race=String(proposed.race??'').slice(0,100);c.portrait=image(c.portrait??'');if(typeof c.notes!=='string'||c.notes.length>100000)throw fail('Notes trop longues.');if(remaining(c,tree)<0&&c.level<old.level)throw fail('Le niveau ne couvre pas les points déjà dépensés.');
 }else throw fail('Commande inconnue.');
 c.revision=row.revision+1;const updated=await db.update(characters).set({data:JSON.stringify(c),revision:c.revision}).where(and(eq(characters.id,row.id),eq(characters.revision,row.revision))).returning({id:characters.id});if(!updated.length)throw fail('Modification simultanée. Rechargez.',409);return respond({character:c});
 }catch(e:any){return Response.json({error:e.message??'Erreur serveur.'},{status:e.status??400,headers:{'Cache-Control':'no-store'}});}}
