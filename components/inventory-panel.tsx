'use client';
import ItemDetails from './item-details';
import InventoryWorkspace,{type InventoryActions} from './inventory-workspace';
import type {Character,Entry} from '../lib/rules';
import type {Tree} from '../lib/progression';
export default function InventoryPanel({mode,character,derived,tree,onEdit,detailItem,onEquip,selectedItemId,...actions}:{mode:'Inventaire'|'Grimoire';character:Character;derived:{weight:number;capacity:number};tree:Tree;onEdit:(item:Entry)=>void;onInspect?:(item:Entry)=>void;detailItem?:Entry;onEquip?:(item:Entry)=>void;selectedItemId?:string}&InventoryActions){
 if(detailItem)return <ItemDetails item={detailItem} character={character} tree={tree}/>;
 return <InventoryWorkspace key={`${character.id}-${mode}`} mode={mode} character={character} derived={derived} tree={tree} onEdit={onEdit} onEquip={onEquip} selectedItemId={selectedItemId} {...actions}/>;
}
