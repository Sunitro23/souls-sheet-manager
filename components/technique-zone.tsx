'use client';
import {useId} from 'react';
export default function Zone({cells,origin}:{cells:number[][];origin?:string}){
 const grid=useId();
 const xs=[0,...cells.map(p=>p[0])],ys=[0,...cells.map(p=>p[1])];const x=Math.min(...xs)-.5,y=Math.min(...ys)-.5,w=Math.max(...xs)-x+.5,h=Math.max(...ys)-y+.5,size=Math.max(w,h);
 return <svg className="c-zone" viewBox={`${x-(size-w)/2} ${y-(size-h)/2} ${size} ${size}`} role="img" aria-label={`Zone : ${cells.length} cases, origine ${origin==='target'?'cible':'porteur'}`}><title>{cells.length} cases · origine {origin==='target'?'cible':'porteur'}</title><defs><pattern id={grid} x="-.5" y="-.5" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="none" stroke="currentColor" strokeWidth=".025" opacity=".4"/></pattern></defs><rect x={x} y={y} width={w} height={h} fill={`url(#${grid})`}/>{cells.map(([a,b],i)=><rect key={i} x={a-.44} y={b-.44} width=".88" height=".88" rx=".12" fill="currentColor"/>)}<circle cx="0" cy="0" r=".23" fill="#e5e8e1" stroke="#141715" strokeWidth=".08"/></svg>
}
