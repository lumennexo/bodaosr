/** BODAS OS · relay Cloudflare Worker. Configure APP_SCRIPT_URL as a secret. */
const ALLOWED_ORIGIN = 'https://lumennexo.github.io';
const ACTIONS = new Set(['panel','boda','catalogo','guardarBoda','archivarBoda','borrarBoda','guardarRubro','borrarRubro','sembrarRubros','guardarPago','borrarPago','guardarInvitado','borrarInvitado','guardarTarea','borrarTarea','guardarEvento','borrarEvento','borradorAvance','enviarAvance']);
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = {'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    if (origin !== ALLOWED_ORIGIN) return new Response('Forbidden',{status:403});
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    if (request.method !== 'POST') return new Response('Method not allowed',{status:405,headers:cors});
    if (!env.APP_SCRIPT_URL || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(env.APP_SCRIPT_URL)) return Response.json({ok:false,error:'Falta configurar APP_SCRIPT_URL en Worker'},{status:503,headers:cors});
    let body;
    try { if (Number(request.headers.get('Content-Length')||0)>200000) throw Error('Solicitud demasiado grande'); body=await request.json(); }
    catch {return Response.json({ok:false,error:'Solicitud inválida'},{status:400,headers:cors});}
    if (!ACTIONS.has(body.accion) || typeof body.token !== 'string' || body.token.length>150 || !body.datos || typeof body.datos!=='object') return Response.json({ok:false,error:'Solicitud no permitida'},{status:400,headers:cors});
    try {
      const upstream=await fetch(env.APP_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({accion:body.accion,datos:body.datos,token:body.token}),redirect:'follow'});
      const raw=await upstream.text();
      let result; try {result=JSON.parse(raw);}catch{throw Error('Apps Script no devolvió JSON. Revisa despliegue y permisos.');}
      return Response.json(result,{status:upstream.ok?200:502,headers:cors});
    } catch(err) {return Response.json({ok:false,error:'No fue posible comunicarse con el servidor: '+err.message},{status:502,headers:cors});}
  }
};
