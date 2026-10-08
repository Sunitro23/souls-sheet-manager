import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutTree} from '../lib/tree-layout.ts';
const node=(id,requires=[])=>({id,name:id,requires,kind:'technique',weapon:'Épées',cost:1,level:1,className:'',race:'',stat:'',amount:0,description:''});
test('chaque prérequis devient une liaison vers une bulle plus basse',()=>{const nodes=[node('a'),node('b'),node('c',['a','b']),node('d',['c'])];const map=layoutTree(nodes,nodes);assert.deepEqual(map.edges.filter(e=>!e.root).map(e=>e.id).sort(),['a:c','b:c','c:d']);for(const e of map.edges)assert.ok(e.to.y>e.from.y);assert.equal(map.points.length,4)});
test('les prérequis externes à une branche restent représentés et ouvrables',()=>{const parent=node('autre-branche');const child=node('expert',['autre-branche']);const map=layoutTree([child],[parent,child]);assert.equal(map.points.length,2);assert.equal(map.points.find(p=>p.node.id===parent.id).external,true);assert.ok(map.edges.some(e=>e.id==='autre-branche:expert'))});
test('les nombreuses bulles ne se chevauchent pas et restent dans le canevas',()=>{const nodes=Array.from({length:40},(_,i)=>node(String(i)));const map=layoutTree(nodes,nodes);for(const p of map.points){assert.ok(p.x>=60&&p.x<=260);assert.ok(p.y+65<map.height);for(const q of map.points)if(p!==q)assert.ok(Math.abs(p.x-q.x)>=120||Math.abs(p.y-q.y)>=105)}});
test('un brouillon cyclique ne bloque pas le rendu',()=>{const nodes=[node('a',['b']),node('b',['a'])];assert.doesNotThrow(()=>layoutTree(nodes,nodes))});
