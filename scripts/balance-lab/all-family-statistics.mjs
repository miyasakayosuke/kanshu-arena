/** Per-appearance resources and properly conditional nullable unit timing fields. */
export function meanUnitMetrics(value){
  const mean=Object.fromEntries(Object.entries(value.sum).map(([field,sum])=>[field,sum/value.observations[field]]));
  const conditionalObservations={};
  for(const field of ['deathTurn','supplyTurn','repairTriggerTurn']){const n=value.observations[field]??0;conditionalObservations[field]=n;mean[field]=n?value.sum[field]/n:null;}
  return {appearances:value.appearances,mean,conditionalObservations};
}
