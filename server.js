const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,ROOT=__dirname,DB=path.join(ROOT,'data','database.json');
const ADMIN_EMAIL='shrishti@smilecraft',ADMIN_PASSWORD='shrishti12',ADMIN_TOKEN='smilecraft-admin-session-2026';
const services=[
{id:'checkup',name:'General Checkup',duration:30,price:500},{id:'cleaning',name:'Teeth Cleaning',duration:45,price:1500},{id:'rootcanal',name:'Root Canal Treatment',duration:60,price:5000},{id:'implant',name:'Dental Implants',duration:90,price:15000},{id:'braces',name:'Braces & Aligners',duration:45,price:3000},{id:'whitening',name:'Teeth Whitening',duration:60,price:3500},{id:'cosmetic',name:'Cosmetic Dentistry',duration:60,price:4000},{id:'emergency',name:'Emergency Care',duration:30,price:800},{id:'other',name:'Other',duration:30,price:500}];
const doctors=[
{id:'dr-arjun',name:'Dr. Arjun Mehta',gender:'male',specialty:'Lead Implantologist & Oral Surgeon',qualifications:['BDS, MDS','FICOI (USA)','Implantology'],experience:'15 yrs experience',schedule:{1:['10:00','18:00'],2:['10:00','18:00'],3:['10:00','18:00'],4:['10:00','18:00'],5:['10:00','18:00'],6:['10:00','15:00']}},
{id:'dr-kavita',name:'Dr. Kavita Sharma',gender:'female',specialty:'Cosmetic Dentist & Smile Designer',qualifications:['BDS, MDS','Aesthetic Dentistry','Laser Cert.'],experience:'12 yrs experience',schedule:{1:['11:00','19:00'],2:['11:00','19:00'],3:['11:00','19:00'],4:['11:00','19:00'],5:['10:00','14:00'],6:['10:00','14:00']}},
{id:'dr-rohan',name:'Dr. Rohan Desai',gender:'male',specialty:'Orthodontist & Aligner Specialist',qualifications:['BDS, MDS Ortho','Invisalign Provider'],experience:'10 yrs experience',schedule:{1:['10:00','17:00'],2:['10:00','17:00'],3:['10:00','17:00'],4:['10:00','17:00'],5:['10:00','17:00']}}
];
function load(){try{return JSON.parse(fs.readFileSync(DB,'utf8'))}catch{return {appointments:[],patients:[],leaves:[]}}}
function save(d){fs.mkdirSync(path.dirname(DB),{recursive:true});fs.writeFileSync(DB,JSON.stringify(d,null,2))}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
function id(prefix){return prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase()}
function mins(t){const [h,m]=String(t).split(':').map(Number);return h*60+m}
function time(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function service(idv){return services.find(x=>x.id===idv)} function doctor(idv){return doctors.find(x=>x.id===idv)}
function daySchedule(doc,date){const d=new Date(date+'T12:00:00');return doc.schedule[d.getDay()]||null}
function isLeave(db,docId,date){return db.leaves.some(x=>x.doctorId===docId&&x.date===date)}
function conflicts(db,docId,date,start,duration,ignoreId){const a=mins(start),b=a+duration;return db.appointments.filter(x=>x.doctorId===docId&&x.preferredDate===date&&x.id!==ignoreId&&!['cancelled','no-show'].includes(x.status)).some(x=>{const s=mins(x.preferredTime),e=s+(x.duration||30);return a<e&&b>s})}
function available(db,docId,serviceId,date,ignoreId){const doc=doctor(docId),svc=service(serviceId);if(!doc||!svc||!date)return [];const sch=daySchedule(doc,date);if(!sch||isLeave(db,docId,date))return [];const out=[];for(let n=mins(sch[0]);n+svc.duration<=mins(sch[1]);n+=15){const t=time(n);if(!conflicts(db,docId,date,t,svc.duration,ignoreId))out.push(t)}return out}
function patientUpsert(db,a){let p=db.patients.find(x=>x.phone===a.phone);if(!p){p={id:id('PAT'),name:a.name,phone:a.phone,email:a.email||'',createdAt:new Date().toISOString()};db.patients.push(p)}else{p.name=a.name;p.email=a.email||p.email}a.patientId=p.id}
function publicAppt(a){const d=doctor(a.doctorId),s=service(a.serviceId);return {...a,doctorName:d?.name||'',doctorSpecialty:d?.specialty||'',doctorGender:d?.gender||'',serviceName:s?.name||'',servicePrice:s?.price||0}}
function adminOK(req){return req.headers.authorization===`Bearer ${ADMIN_TOKEN}`}
function adminGuard(req,res){if(!adminOK(req)){json(res,401,{error:'Admin authentication required.'});return false}return true}
async function route(req,res){const u=new URL(req.url,'http://localhost');const p=u.pathname;
if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization'});return res.end()}
if(p==='/api/health')return json(res,200,{ok:true,service:'SmileCraft Clinic API',time:new Date().toISOString()});
if(p==='/api/services')return json(res,200,services);
if(p==='/api/doctors')return json(res,200,doctors.map(d=>({...d})).filter(x=>x.active!==false));
if(p==='/api/availability'&&req.method==='GET'){const db=load(),slots=available(db,u.searchParams.get('doctorId'),u.searchParams.get('serviceId'),u.searchParams.get('date'),u.searchParams.get('ignoreId'));return json(res,200,{slots})}
if(p==='/api/appointments'&&req.method==='POST'){
 const b=await body(req),db=load(),doc=doctor(b.doctorId),svc=service(b.serviceId);if(!b.name||!b.phone||!doc||!svc||!b.preferredDate||!b.preferredTime)return json(res,400,{error:'Please complete all required booking fields.'});if(!/^\+?[0-9 ()-]{8,20}$/.test(b.phone))return json(res,400,{error:'Please enter a valid phone number.'});
 if(!available(db,b.doctorId,b.serviceId,b.preferredDate).includes(b.preferredTime))return json(res,409,{error:'This slot is no longer available. Please choose another time.'});
 const a={id:id('SC'),name:b.name.trim(),phone:b.phone.trim(),email:(b.email||'').trim(),doctorId:b.doctorId,serviceId:b.serviceId,preferredDate:b.preferredDate,preferredTime:b.preferredTime,duration:svc.duration,message:(b.message||'').trim(),status:'pending',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};patientUpsert(db,a);db.appointments.push(a);save(db);return json(res,201,{message:'Appointment booked successfully',appointment:publicAppt(a)})}
const am=p.match(/^\/api\/appointments\/([^/]+)$/);
if(am&&req.method==='GET'){const a=load().appointments.find(x=>x.id===am[1]);return a?json(res,200,{appointment:publicAppt(a)}):json(res,404,{error:'Appointment not found'})}
if(am&&req.method==='PATCH'){
 const db=load(),a=db.appointments.find(x=>x.id===am[1]);if(!a)return json(res,404,{error:'Appointment not found'});const b=await body(req);
 if(b.action==='cancel'){if(a.status==='cancelled')return json(res,200,{message:'Appointment already cancelled',appointment:publicAppt(a)});a.status='cancelled';a.updatedAt=new Date().toISOString();save(db);return json(res,200,{message:'Appointment cancelled successfully',appointment:publicAppt(a)})}
 if(b.action==='reschedule'){if(a.status==='cancelled')return json(res,409,{error:'Cancelled appointments cannot be rescheduled. Please book a new appointment.'});if(!b.preferredDate||!b.preferredTime)return json(res,400,{error:'Choose a new date and time.'});if(!available(db,a.doctorId,a.serviceId,b.preferredDate, a.id).includes(b.preferredTime))return json(res,409,{error:'That time is not available. Please choose another slot.'});a.preferredDate=b.preferredDate;a.preferredTime=b.preferredTime;a.status='pending';a.updatedAt=new Date().toISOString();save(db);return json(res,200,{message:'Appointment rescheduled successfully',appointment:publicAppt(a)})}
 return json(res,400,{error:'Unsupported action'})}
if(p==='/api/admin/login'&&req.method==='POST'){const b=await body(req);if(b.email===ADMIN_EMAIL&&b.password===ADMIN_PASSWORD)return json(res,200,{token:ADMIN_TOKEN});return json(res,401,{error:'Invalid admin ID or password.'})}
if(p.startsWith('/api/admin/')&&!adminGuard(req,res))return;
if(p==='/api/admin/summary'&&req.method==='GET'){const db=load();return json(res,200,{appointments:db.appointments.length,pending:db.appointments.filter(x=>x.status==='pending').length,confirmed:db.appointments.filter(x=>x.status==='confirmed').length,cancelled:db.appointments.filter(x=>x.status==='cancelled').length,patients:db.patients.length})}
if(p==='/api/admin/appointments'&&req.method==='GET'){const db=load();return json(res,200,db.appointments.slice().reverse().map(publicAppt))}
if(p==='/api/admin/appointments'&&req.method==='PATCH'){const db=load(),b=await body(req),a=db.appointments.find(x=>x.id===b.id);if(!a)return json(res,404,{error:'Appointment not found'});if(b.status)a.status=b.status;if(b.doctorId)a.doctorId=b.doctorId;if(b.preferredDate&&b.preferredTime){if(!available(db,a.doctorId,a.serviceId,b.preferredDate,a.id).includes(b.preferredTime))return json(res,409,{error:'Selected slot is not available.'});a.preferredDate=b.preferredDate;a.preferredTime=b.preferredTime}a.updatedAt=new Date().toISOString();save(db);return json(res,200,{appointment:publicAppt(a)})}
if(p==='/api/admin/patients'&&req.method==='GET'){const db=load();return json(res,200,db.patients.map(pt=>({...pt,appointments:db.appointments.filter(a=>a.patientId===pt.id).length,lastAppointment:db.appointments.filter(a=>a.patientId===pt.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]?.preferredDate||''})))}
if(p==='/api/admin/leaves'&&req.method==='GET')return json(res,200,load().leaves);
if(p==='/api/admin/leaves'&&req.method==='POST'){const b=await body(req),db=load();if(!doctor(b.doctorId)||!b.date)return json(res,400,{error:'Doctor and date required'});if(!isLeave(db,b.doctorId,b.date))db.leaves.push({id:id('LV'),doctorId:b.doctorId,date:b.date,reason:b.reason||'Leave'});save(db);return json(res,201,{leaves:db.leaves})}
if(p==='/api/admin/leaves'&&req.method==='DELETE'){const b=await body(req),db=load();db.leaves=db.leaves.filter(x=>x.id!==b.id);save(db);return json(res,200,{leaves:db.leaves})}
if(p.startsWith('/api/'))return json(res,404,{error:'API route not found'});
let file=p==='/'?'/public/index.html':p==='/admin'?'/public/admin.html':p;const fp=path.join(ROOT,file);if(!fp.startsWith(ROOT)||!fs.existsSync(fp))return json(res,404,{error:'Not found'});const ext=path.extname(fp),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};res.writeHead(200,{'Content-Type':types[ext]||'text/plain'});fs.createReadStream(fp).pipe(res)}
http.createServer((req,res)=>route(req,res).catch(e=>json(res,500,{error:e.message}))).listen(PORT,()=>console.log(`SmileCraft Clinic running at http://localhost:${PORT}`));
