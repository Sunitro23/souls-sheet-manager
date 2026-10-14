import {spellSchool} from '../lib/bonuses';
import type {Entry} from '../lib/rules';

export default function SpellIcon({spell}:{spell:Entry}){
 const school=spellSchool(spell);
 const shapes={
  Miracles:<><circle cx="32" cy="32" r="13"/><path d="M32 5v8m0 38v8M5 32h8m38 0h8M13 13l6 6m26 26 6 6M13 51l6-6m26-26 6-6M32 23v18m-7-9h14"/></>,
  Sorts:<><path d="m32 5 12 26-12 27-12-27Z"/><path d="M20 31h24M32 5v53M10 15v10m-5-5h10M52 38v12m-6-6h12"/></>,
  Pyromancies:<><path d="M33 5c3 17-17 19-16 34 0 12 7 19 17 19s18-8 18-19c0-8-5-15-11-20 2 8-2 12-6 14 2-10 2-19-2-28Z"/><path d="M32 36c1 7-7 9-7 15 0 4 4 7 9 7s8-4 8-8c0-5-3-10-5-12 0 5-3 7-5 8"/></>,
  Malédictions:<><path d="M42 7a25 25 0 1 0 15 39A22 22 0 0 1 42 7Z"/><path d="m40 25 10 7-10 7-10-7Z"/><circle cx="40" cy="32" r="2"/><path d="M18 40l4 5m0 4 5 3"/></>,
  Mélodies:<><path d="M22 45V15l29-7v30M22 23l29-7"/><ellipse cx="15" cy="48" rx="8" ry="6"/><ellipse cx="44" cy="41" rx="8" ry="6"/><path d="M34 29v10m-5-5h10"/></>,
 };
 return <svg className="c-spell-art" data-school={school} viewBox="0 0 64 64" fill="currentColor" fillOpacity=".13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[school as keyof typeof shapes]}</svg>;
}
