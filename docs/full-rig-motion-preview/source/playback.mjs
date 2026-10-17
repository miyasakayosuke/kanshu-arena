export function playbackState(state,action){
 const next={...state};
 if(action.type==='play'){next.playing=true;next.rate=action.rate===.25?.25:1;if(next.ms>=1500)next.ms=0;}
 else if(action.type==='pause')next.playing=false;
 else if(action.type==='seek'){next.ms=Math.max(0,Math.min(1500,Number(action.ms)||0));next.playing=false;}
 else if(action.type==='restart'){next.ms=0;next.playing=true;}
 else if(action.type==='tick'&&next.playing){next.ms=Math.min(1500,next.ms+Math.max(0,action.delta)*next.rate);if(next.ms===1500)next.playing=false;}
 return next;
}
