// Test-only passive selection. This never advances time or mutates combat.
export function createBiteLifecycle() {
  let active=null, serial=0;
  const records=new WeakMap();
  const retire=()=>{if(active){active.retired=true;active=null;}};
  return {
    clear(){retire();},
    sample({event,actorId,alive=true,age=2000,reduced=false,ready=false}) {
      const exact=event?.kind==='cast' && actorId===12 && event.skill==='月下の一咬';
      if(!exact){retire();return {eligible:false,animate:false,serial:null,reason:'unrelated-or-clear'};}
      if(active?.event!==event){retire();let record=records.get(event);if(!record){record={event,serial:++serial,ready,retired:false};records.set(event,record);}active=record;}
      if(!alive || age>=1500 || age<0) active.retired=true;
      const eligible=!active.retired;
      return {eligible,animate:eligible&&active.ready&&!reduced,serial:active.serial,assetsLatched:active.ready,reason:!eligible?'retired':reduced?'reduced':!active.ready?'assets-unready':'candidate'};
    },
  };
}
