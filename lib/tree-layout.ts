import type {Node} from './progression.ts';
// Each edge follows a real prerequisite. The root connects independent nodes.
export function layoutTree(selected:Node[],all:Node[]){
 const byId=new Map(all.map(n=>[n.id,n])),included=new Map<string,Node>();
 function include(n:Node){if(included.has(n.id))return;included.set(n.id,n);n.requires.forEach(id=>{const p=byId.get(id);if(p)include(p)})}selected.forEach(include);
 const ranks=new Map<string,number>();const visiting=new Set<string>();
 function rank(n:Node):number{if(ranks.has(n.id))return ranks.get(n.id)!;if(visiting.has(n.id))return 0;visiting.add(n.id);const parents=n.requires.map(id=>included.get(id)).filter(Boolean) as Node[];const value=parents.length?Math.max(...parents.map(rank))+1:0;visiting.delete(n.id);ranks.set(n.id,value);return value;}
 [...included.values()].forEach(rank);let y=60;const points:Array<{node:Node;x:number;y:number;external:boolean}>=[];
 for(let depth=0;depth<=Math.max(0,...ranks.values());depth++){const group=[...included.values()].filter(n=>ranks.get(n.id)===depth);const columns=Math.min(3,group.length);group.forEach((node,i)=>{const row=Math.floor(i/3),rowCount=Math.min(3,group.length-row*3);points.push({node,x:(i%3+.5)*320/rowCount,y:y+row*160,external:!selected.some(n=>n.id===node.id)})});y+=Math.ceil(group.length/3)*160;}
 const positions=new Map(points.map(p=>[p.node.id,p]));const edges=points.flatMap(p=>p.node.requires.length?p.node.requires.map(id=>positions.get(id)).filter(Boolean).map(parent=>({id:`${parent!.node.id}:${p.node.id}`,from:parent!,to:p,root:false})):[{id:`root:${p.node.id}`,from:{x:160,y:30},to:p,root:true}]);
 return {points,edges,height:Math.max(220,y-40)};
}
