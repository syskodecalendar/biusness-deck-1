export function pageParams(req){const page=Math.max(Number(req.query.page||1),1),limit=Math.min(Math.max(Number(req.query.limit||50),1),200);return{page,limit,from:(page-1)*limit,to:page*limit-1}}
export function clean(obj){return Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==undefined))}
