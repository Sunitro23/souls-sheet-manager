'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Backpack,Sparkles,Plus,Search,ShieldCheck,Trash2,X,Pencil} from 'lucide-react';
import {derive,entry,type Character,type Entry} from '../lib/rules';
import {bagItems,equipUnavailableReason,inventoryFilters,itemSummary} from '../lib/inventory';
import {categoryFor} from '../lib/campaign-settings';
import type {Tree} from '../lib/progression';
import {useCampaignSettings} from './campaign-theme';
import EquipmentLoadout,{type EquipmentSlot} from './equipment-loadout';
import CollectionRow from './collection-row';
import SpellIcon from './spell-icon';
import GrimoireLoadout from './grimoire-loadout';
import {librarySpells,memorizeUnavailableReason,spellFamily,spellFilters,spellSummary} from '../lib/spell-library';
import ItemDetails,{itemTypes} from './item-details';
import ItemForm from './item-form';
import DetailSidePanel,{useDetailOverlay} from './detail-side-panel';

const filterIcons:Record<string,string>={all:'sprite-1-1',weapon:'sprite-1-2',armor:'sprite-2-1',talisman:'sprite-2-4',consumable:'sprite-3-1',other:'sprite-1-4'};

export type InventoryActions={onSaveItem?:(item:Entry)=>Promise<boolean>;onDeleteItem?:(item:Entry)=>Promise<boolean>;onDirtyChange?:(dirty:boolean)=>void;onDismissError?:()=>void;busy?:boolean;error?:string};
export default function InventoryWorkspace({mode='Inventaire',character,derived,tree,onEdit,onEquip,onSaveItem,onDeleteItem,onDirtyChange,onDismissError,busy=false,error='',selectedItemId}:{mode?:'Inventaire'|'Grimoire';character:Character;derived:{weight:number;capacity:number};tree:Tree;onEdit:(item:Entry)=>void;onEquip?:(item:Entry)=>void;selectedItemId?:string}&InventoryActions) {
 const settings=useCampaignSettings(),prefix=useId(),detailsId=`${prefix}-details`;
 const mobile=useDetailOverlay(),spells=mode==='Grimoire',collection=spells?character.spells:character.inventory;
 const CollectionIcon=spells?Sparkles:Backpack,collectionTitle=spells?'Bibliothèque':'Sac',noun=spells?'sort':'objet';
 const memory=spells?derive(character):null,used=memory?.used??derived.weight,capacity=memory?.memory??derived.capacity;
 const filters=spells?spellFilters(collection,settings):inventoryFilters;
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[slot,setSlot]=useState<EquipmentSlot|null>(null);
 const [selection,setSelection]=useState<Entry|undefined>(()=>collection.find(i=>i.id===selectedItemId)),[draft,setDraft]=useState<Entry|null>(null),[initialDraft,setInitialDraft]=useState('');
 const [panelOpen,setPanelOpen]=useState(!!selectedItemId);
 const root=useRef<HTMLElement>(null),trigger=useRef<HTMLElement|null>(null),search=useRef<HTMLInputElement>(null);
 const draftDirty=!!draft&&JSON.stringify(draft)!==initialDraft;
 const selected=collection.find(i=>i.id===selection?.id&&!i.archived)??(busy||error?selection:undefined),open=panelOpen&&(!!selected||!!draft),editing=!!draft;
 const selectedId=selected?.id;
 const items=spells?librarySpells(collection):bagItems(collection),visible=spells?librarySpells(collection,query,filter,settings):bagItems(collection,query,filter,slot?.type);
 const count=spells?items.filter(i=>i.known).length:items.length;
 const unavailable=selected?(spells?selected.memorized?'':memorizeUnavailableReason(character,selected):equipUnavailableReason(character,selected)):'';
 const existing=!!draft&&collection.some(i=>i.id===draft.id);
 const title=draft?existing?spells?'Modifier le sort':'Modifier l’objet':`Créer un ${noun}`:spells?'Détails du sort':'Détails de l’objet';
 useEffect(()=>{onDirtyChange?.(draftDirty);return()=>onDirtyChange?.(false)},[draftDirty,onDirtyChange]);
 function canDiscard(){return !draftDirty||confirm(`Fermer sans enregistrer les modifications de ce${spells?' sort':'t objet'} ?`)}
 function close(){if(busy||!canDiscard())return;setDraft(null);setPanelOpen(false);const target=trigger.current?.isConnected?trigger.current:selectedId?root.current?.querySelector<HTMLElement>(`[data-inventory-item="${CSS.escape(selectedId)}"]`):null;(target??search.current)?.focus()}
 function inspect(item:Entry){if(busy||!canDiscard())return;trigger.current=document.activeElement as HTMLElement;setDraft(null);setSelection(item);setPanelOpen(true)}
 function edit(item:Entry){if(!onSaveItem){onEdit(structuredClone(item));return}if(busy||!canDiscard())return;if(!open)trigger.current=document.activeElement as HTMLElement;const next=structuredClone(item);setInitialDraft(JSON.stringify(next));setDraft(next);setSelection(collection.find(i=>i.id===item.id));setPanelOpen(true)}
 function resetFilters(){setQuery('');setFilter('all');setSlot(null)}
 function choose(next:EquipmentSlot){setSlot(next);setFilter(next.type);setQuery('');search.current?.focus();search.current?.scrollIntoView({block:'nearest',behavior:'instant'})}
 async function saveDraft(){if(!draft||!onSaveItem||busy)return;if(await onSaveItem(draft)){setSelection(draft);setDraft(null)}}
 async function remove(item:Entry){if(!onDeleteItem||busy)return;if(await onDeleteItem(item)){setDraft(null);setSelection(undefined);search.current?.focus()}}
 const content=<>
  {draft?<><button type="button" className="c-text-button" disabled={busy} onClick={()=>{if(!selected)close();else if(canDiscard())setDraft(null)}}>Annuler les modifications</button><ItemForm key={draft.id} character={character} item={draft} onChange={setDraft} onSave={()=>void saveDraft()} onDelete={onDeleteItem?()=>void remove(draft):undefined} busy={busy} existing={existing}/></>:selected?<>
   <div className="c-inventory-item-state">{spells?selected.memorized?<><Sparkles size={15}/>Mémorisé</>:<><Sparkles size={15}/>Dans la bibliothèque{!selected.known?' · Non connu':''}</>:selected.equipped?<><ShieldCheck size={15}/>Équipé</>:<><Backpack size={15}/>Dans le sac</>}</div>
   <ItemDetails item={selected} character={character} tree={tree}>
   <div className="c-detail-actions">{onEquip&&<button type="button" className="c-primary" disabled={busy||!!unavailable} aria-describedby={unavailable?`${prefix}-equip-reason`:undefined} onClick={()=>onEquip(selected)}>{spells?selected.memorized?'Retirer de la mémoire':'Mémoriser':selected.equipped?'Déséquiper':'Équiper'}</button>}<button type="button" className="c-button" disabled={busy} onClick={()=>edit(selected)}><Pencil size={15}/>Modifier</button>{onDeleteItem&&<button type="button" className="c-text-button c-danger" disabled={busy} onClick={()=>void remove(selected)}><Trash2 size={15}/>Supprimer</button>}</div>
   {onEquip&&unavailable&&<p className="c-detail-hint" id={`${prefix}-equip-reason`}>{unavailable}</p>}
   </ItemDetails>
  </>:null}
 </>;
 return <section ref={root} className="c-inventory-workspace" aria-label={spells?'Sorts':'Inventaire'}>
  <div className="c-inventory-load" data-state={used>capacity?'overloaded':used>=(spells?capacity:capacity-1)?'near':'normal'} role="status"><CollectionIcon size={17}/><span>{spells?'Mémoire utilisée':'Charge équipée'} : <strong>{used} / {capacity}</strong></span>{used>capacity?<small>{spells?'Capacité dépassée':`Surcharge +${used-capacity}`}</small>:used>=capacity?<small>Capacité atteinte</small>:!spells&&used>=capacity-1?<small>Proche de la capacité</small>:null}</div>
  <div className={`c-detail-layout ${open&&!mobile?'has-details':''}`}>
   <div className="c-inventory-lists">
    {spells?<GrimoireLoadout character={character} onInspect={inspect} selectedId={selectedId} detailsId={detailsId} detailsOpen={open}/>:<EquipmentLoadout character={character} onInspect={inspect} onChoose={choose} selectedId={selectedId} detailsId={detailsId} detailsOpen={open}/>}
    <section className="c-inventory-bag" aria-label={collectionTitle}><div className="c-inventory-heading"><h3>{collectionTitle}</h3><button type="button" className="c-icon c-inventory-create" aria-label={`Créer un ${noun}`} title={`Créer un ${noun}`} disabled={busy} onClick={()=>edit(entry('',spells?'spell':slot?.type??'weapon'))}><Plus size={16}/></button><span>{count} {noun}{count!==1?'s':''}{spells?` connu${count!==1?'s':''}`:''}</span></div>
     <div className="c-inventory-search"><Search size={17}/><input ref={search} type="search" aria-label={spells?'Rechercher un sort dans la bibliothèque':'Rechercher un objet dans le sac'} placeholder={`Rechercher un ${noun}…`} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" className="c-icon" aria-label="Effacer la recherche" onClick={()=>{setQuery('');search.current?.focus()}}><X size={16}/></button>}</div>
     <div className="c-inventory-filters" role="group" aria-label={spells?'Familles magiques':'Catégories du sac'}>{filters.map(f=><button key={f.id} type="button" aria-pressed={filter===f.id} onClick={()=>{setFilter(f.id);setSlot(null)}}>{spells&&f.id!=='all'?<SpellIcon school={f.id}/>:<img src={`/ui/dark-souls/interface/${filterIcons[f.id]??'sprite-2-5'}.png`} width={28} height={28} alt="" aria-hidden="true"/>}<span>{f.label}</span></button>)}</div>
     {slot&&<div className="c-inventory-slot-choice"><span>Choisir pour {slot.label.toLocaleLowerCase('fr')}</span><button type="button" className="c-icon" aria-label="Annuler le choix d’emplacement" onClick={resetFilters}><X size={15}/></button></div>}
     <p className="c-inventory-result-count" role="status">{query||filter!=='all'||slot?`${visible.length} ${noun}${visible.length!==1?'s':''} trouvé${visible.length!==1?'s':''}`:''}</p>
     <ul className="c-inventory-items">{visible.map(item=><li key={item.id}><CollectionRow item={item} onSelect={inspect} selectedId={selectedId} detailsId={detailsId} detailsOpen={open} category={spells?spellFamily(item,settings).label:categoryFor(settings,item)?.name||item.category||itemTypes[item.type]} summary={spells?spellSummary(item,character):itemSummary(item)} status={spells&&!item.known?'Non connu':undefined}/></li>)}</ul>
     {!visible.length&&<div className="c-inventory-empty"><CollectionIcon size={26}/><p>{!items.length?spells?'Aucun sort dans la bibliothèque.':'Votre sac est vide.':slot?'Aucun objet compatible dans le sac.':`Aucun ${noun} ne correspond à votre recherche.`}</p>{query||filter!=='all'||slot?<button type="button" className="c-text-button" onClick={resetFilters}>{spells?'Voir toute la bibliothèque':'Voir tout le sac'}</button>:<span>{spells?'Créez un sort pour l’ajouter à votre bibliothèque.':'Créez un objet pour l’ajouter à vos possessions.'}</span>}</div>}
    </section>
   </div>
   {(selected||draft)&&<DetailSidePanel id={detailsId} title={title} open={open} onClose={close} busy={busy} error={error} onDismissError={onDismissError} focusKey={selectedId} autoFocus={!editing}>{content}</DetailSidePanel>}
  </div>
 </section>;
}
