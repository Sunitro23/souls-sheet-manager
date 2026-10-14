import type {Entry} from '../lib/rules';

// Vector silhouettes remain crisp at slot and list sizes.
export default function EquipmentIcon({item,type}:{item?:Entry;type:string}){
 const category=(item?.category||'').toLowerCase();
 let shape;
 if(type==='armor')shape=<><path d="m21 10-12 9 8 13 5-3-3 25h26l-3-25 5 3 8-13-12-9-5 6H26Z"/><path d="m26 16 6 8 6-8M32 24v30M22 43h20"/></>;
 else if(type==='talisman')shape=<><ellipse cx="32" cy="38" rx="16" ry="19"/><ellipse cx="32" cy="38" rx="11" ry="14"/><path d="m23 16 9-9 9 9-9 11Z"/></>;
 else if(type==='shield'||/bouclier/.test(category))shape=<><path d="m32 7 22 8-3 23Q47 49 32 58 17 49 13 38L10 15Z"/><path d="M32 13v36M17 20l15-5 15 5"/></>;
 else if(type==='catalyst'||/bâton|stave|sceau/.test(category))shape=<><path d="m21 55 20-38M34 9l8-5 8 8-5 9-9-2Z"/><path d="m38 10 6 5-5 4M18 52l7 4"/></>;
 else if(/arbal|ballist/.test(category))shape=<><path d="m12 53 35-39M15 18q17-9 37 17M16 18l8 25 28-8M24 43l23-29M9 49l8 8"/></>;
 else if(/arc|bow/.test(category))shape=<><path d="M19 6q43 26 0 52L28 32Z"/><path d="M12 32h43m-7-7 7 7-7 7"/></>;
 else if(/hache|axe|hallebarde/.test(category))shape=<><path d="m17 56 24-47M25 12q14 5 28 4l-9 21q-5-12-19-14Z"/><path d="m15 52 7 4"/></>;
 else if(/marteau|hammer|colossal/.test(category))shape=<><path d="m19 55 18-32M23 8l29 15-8 16-29-15Z"/><path d="m20 14 29 15M16 52l8 4"/></>;
 else if(/lance|spear/.test(category))shape=<><path d="m12 56 28-37M35 21 39 8l15-5-4 17-12 6Z"/><path d="m38 24 11-15M10 52l6 5"/></>;
 else if(/faux/.test(category))shape=<><path d="M24 57 35 8M34 11Q55 9 58 34 43 18 19 15Z"/></>;
 else if(/fléau|fouet/.test(category))shape=<><path d="m13 55 14-25M27 30q22 0 14-15l-6-4"/><circle cx="29" cy="12" r="8"/><path d="m10 52 6 4M29 1v4M18 12h4M36 12h5"/></>;
 else if(/griffe/.test(category))shape=<><path d="m15 49 10-9 7 8-9 10ZM25 40 40 9 34 42M31 45 50 17 40 48M20 36 30 6 29 30"/></>;
 else shape=<><path d="m22 40 4-12L54 5l-9 33-11 6Z"/><path d="m27 37 21-24M16 34l21 17M12 52l12-13 7 6-12 14Z"/><path d="m9 51 12 11"/></>;
 return <svg className="c-gear-art c-equipment-icon" viewBox="0 0 64 64" fill="currentColor" fillOpacity=".13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}
