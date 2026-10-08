'use client';
import {useRef,useState} from 'react';
import {Camera,User,Trash2} from 'lucide-react';
async function compressPortrait(file:File):Promise<string>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choisissez une photo JPG, PNG ou WebP.');
 if(file.size>25*1024*1024)throw Error('Cette photo est trop volumineuse (25 Mo maximum).');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const scale=Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Impossible de préparer cette photo.');ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.7,.5,.3]){const data=canvas.toDataURL('image/webp',quality);if(data.length<=600000)return data;}
  throw Error('Choisissez une photo plus petite.');
 }finally{URL.revokeObjectURL(url);}
}
export default function PortraitPicker({value,onChange,disabled=false,onBusyChange}:{value:string;onChange:(value:string)=>void;disabled?:boolean;onBusyChange?:(busy:boolean)=>void}){
 const input=useRef<HTMLInputElement>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 return <div className="c-portrait-picker">
 <div className="c-portrait-row"><button type="button" className="c-portrait-preview" aria-label={value?'Remplacer le portrait':'Ajouter un portrait'} disabled={disabled||loading} onClick={()=>input.current?.click()}>{value?<img src={value} alt="Portrait du personnage"/>:<User size={30}/>}<span><Camera size={15}/></span></button>
 <button type="button" className="c-text-button" disabled={disabled||loading} onClick={()=>input.current?.click()}>{loading?'Préparation…':value?'Changer la photo':'Ajouter une photo'}</button>
 {value&&<button type="button" className="c-icon" aria-label="Retirer la photo" disabled={disabled||loading} onClick={()=>{onChange('');setError('');}}><Trash2 size={17}/></button>}</div>
 <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setLoading(true);onBusyChange?.(true);setError('');try{onChange(await compressPortrait(file));}catch(err){setError(err instanceof Error?err.message:'Impossible de lire cette photo.');}finally{setLoading(false);onBusyChange?.(false);}}}/>
 {error&&<p className="c-sheet-error" role="alert">{error}</p>}
 <details><summary>Utiliser un lien</summary><label className="c-field"><span>URL HTTPS de la photo</span><input type="url" inputMode="url" placeholder="https://…" value={value.startsWith('data:')?'':value} disabled={disabled||loading} onChange={e=>onChange(e.target.value)}/></label></details>
 </div>
}
