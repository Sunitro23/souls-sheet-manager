import type {statNames} from '../lib/rules';
export default function StatIcon({stat}:{stat:typeof statNames[number]}){
 const shapes={
 FOR:<><path d="m12 48 7-20 9-4 3 8 8-6 9 5 6 14-9 9H22Z"/><path d="m19 28-4-10 8-7 9 3 1 9-5 1M30 39q10-8 17 2"/></>,
 DEX:<><path d="m17 46 9-15-6-12 9-8 10 13-6 12 14 14M26 31l-15 1M38 25l14-5M17 46l-7 8m37-4 8 2"/><circle cx="39" cy="9" r="5"/></>,
 CON:<><path d="M32 54 10 32C-1 14 21 4 32 19 43 4 65 14 54 32Z"/><path d="M9 32h14l5-10 7 22 5-12h15"/></>,
 INT:<><path d="M32 16Q18 8 7 13v38q12-5 25 2 13-7 25-2V13q-12-5-25 3Zm0 0v37"/><path d="M14 23l11 3M14 32l11 3M39 26l11-3M39 35l11-3"/></>,
 SAG:<><path d="M4 32Q32 1 60 32 32 63 4 32Z"/><circle cx="32" cy="32" r="11"/><circle cx="32" cy="32" r="3"/><path d="M32 5v7m0 40v7"/></>,
 CHA:<><path d="M12 12q20 10 40 0v20Q50 50 32 58 14 50 12 32Z"/><path d="m19 27 8 2m10 0 8-2M22 39q10 12 20 0M32 22v13"/></>,
 };
 return <svg className="c-stat-art" viewBox="0 0 64 64" fill="currentColor" fillOpacity=".13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[stat]}</svg>;
}
