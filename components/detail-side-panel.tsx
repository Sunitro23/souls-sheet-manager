'use client';
import {useEffect,useRef,useSyncExternalStore,type ReactNode} from 'react';
import {X} from 'lucide-react';
import Dialog from './modal';

function subscribe(listener:()=>void){const media=window.matchMedia('(max-width: 760px)');media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener)}
const snapshot=()=>window.matchMedia('(max-width: 760px)').matches;
export function useDetailOverlay(){return useSyncExternalStore(subscribe,snapshot,()=>false)}

export default function DetailSidePanel({id,title,children,open=true,onClose,busy=false,error='',onDismissError,focusKey,autoFocus=true}:{id:string;title:string;children:ReactNode;open?:boolean;onClose:()=>void;busy?:boolean;error?:string;onDismissError?:()=>void;focusKey?:string;autoFocus?:boolean}){
 const overlay=useDetailOverlay(),panel=useRef<HTMLElement>(null),trigger=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(overlay||!open)return;
  const active=document.activeElement;
  if(active instanceof HTMLElement&&!panel.current?.contains(active))trigger.current=active;
  if(autoFocus)panel.current?.focus({preventScroll:true});
 },[overlay,open,focusKey,autoFocus]);
 useEffect(()=>{if(!open&&trigger.current?.isConnected)trigger.current.focus({preventScroll:true})},[open]);
 useEffect(()=>()=>{if(trigger.current?.isConnected)trigger.current.focus({preventScroll:true})},[]);
 useEffect(()=>{
  if(overlay||!open)return;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy&&!document.querySelector('dialog[open]')){event.preventDefault();onClose()}};
  document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);
 },[overlay,open,busy,onClose]);
 const content=<div className="c-detail-content">{children}</div>;
 return overlay?open?<Dialog title={title} close={onClose} busy={busy} error={error} dismissError={onDismissError} wide><div id={id} className="c-detail-drawer">{content}</div></Dialog>:null:<div className="c-detail-slot" data-open={open} inert={!open} aria-hidden={!open}><aside ref={panel} id={id} className="c-detail-sidebar" aria-labelledby={`${id}-title`} tabIndex={-1}><header className="c-detail-sidebar-heading"><h3 id={`${id}-title`}>{title}</h3><button type="button" className="c-icon" aria-label="Fermer les détails" disabled={busy} onClick={onClose}><X size={19}/></button></header>{error&&<p className="c-sheet-error" role="alert">{error}</p>}{content}</aside></div>;
}
