'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export default function Dialog({title,close,children,error='',dismissError,busy=false,wide=false,page=false}:{title:string;close:()=>void;children:ReactNode;error?:string;dismissError?:()=>void;busy?:boolean;wide?:boolean;page?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;const active=document.activeElement as HTMLElement|null;el?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el?.close();document.body.style.overflow=previous;if(active?.isConnected)active.focus()}},[]);
 const requestClose=()=>{if(!busy)close()};
 return <dialog ref={ref} className={`c-modal ${wide?'c-modal-wide':''} ${page?'c-modal-page':''}`} aria-label={title} aria-busy={busy} onCancel={e=>{e.preventDefault();requestClose()}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)requestClose()}}}><div className="c-sheet-handle"/><div className="c-title compact"><h2>{title}</h2><button type="button" className="c-icon" aria-label="Fermer" disabled={busy} onClick={requestClose}><X size={20}/></button></div>{error&&<div className="c-sheet-error" role="alert"><span>{error}</span><button type="button" className="c-icon" aria-label="Fermer l’erreur" onClick={dismissError}><X size={16}/></button></div>}<fieldset className="c-dialog-content" disabled={busy}>{children}</fieldset></dialog>;
}
