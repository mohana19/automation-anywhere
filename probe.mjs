import 'dotenv/config';
const host = process.env.CR_URL.replace(/\/+$/,'');
const token = (await (await fetch(host+'/v2/authentication',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:process.env.AA_USERNAME,password:process.env.AA_PASSWORD})})).json()).token;
const H={'Content-Type':'application/json','X-Authorization':token};
// find newest AutomatedProcess_UC2 file
const l = await (await fetch(host+'/v2/repository/workspaces/private/files/list',{method:'POST',headers:H,body:JSON.stringify({filter:{operator:'substring',field:'name',value:'AutomatedProcess_UC2'},page:{offset:0,length:50}})})).json();
console.log('matches:', (l.list||[]).map(f=>`${f.id}:${f.name}`).join(', '));
const proc = (l.list||[]).sort((a,b)=>Number(b.id)-Number(a.id))[0];
if(proc){
  const c = await fetch(host+`/v2/repository/files/${proc.id}/content`,{headers:{'X-Authorization':token}});
  console.log('process', proc.id, 'content status', c.status);
  console.log(JSON.stringify(await c.json()).slice(0,600));
}
