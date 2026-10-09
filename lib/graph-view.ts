export type View={x:number;y:number;zoom:number};
export const MIN_ZOOM=.5,MAX_ZOOM=2;
export function clampZoom(zoom:number){return Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,zoom));}
export function zoomAt(view:View,zoom:number,point:{x:number;y:number}):View{const next=clampZoom(zoom),ratio=next/view.zoom;return {zoom:next,x:point.x-(point.x-view.x)*ratio,y:point.y-(point.y-view.y)*ratio};}
export function centerView(zoom:number,width:number,height:number,graphWidth:number,graphHeight:number):View{return {zoom,x:(width-graphWidth*zoom)/2,y:(height-graphHeight*zoom)/2};}
export function fitView(width:number,height:number,graphWidth:number,graphHeight:number):View{const zoom=clampZoom(Math.min((width-40)/graphWidth,(height-40)/graphHeight,1.5));return centerView(zoom,width,height,graphWidth,graphHeight);}
