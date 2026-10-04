import { admin } from '../lib.js'
export async function audit(req,action,entityType,entityId,beforeData=null,afterData=null){
  await admin.from('audit_logs').insert({user_id:req.profile?.id||null,action,entity_type:entityType,entity_id:String(entityId||''),before_data:beforeData,after_data:afterData,ip_address:req.ip}).then(()=>{})
}
