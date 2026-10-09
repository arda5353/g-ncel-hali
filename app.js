// HayatNFC: hesap oluşturma, giriş ve sağlık profili ayrı akışlardır.
// Mevcut Supabase URL, publishable key, tablo adları ve veritabanı şeması korunmuştur.
const SUPABASE_URL = 'https://gcvzucqqdwdqlqaooaqy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ug_reIhOvpfRIRk7YeYpvQ_xgcg2ve9';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const views = [...document.querySelectorAll('.view')];
const navButtons = [...document.querySelectorAll('[data-view]')];
const signupForm = document.querySelector('#signupForm');
const loginForm = document.querySelector('#participantLoginForm');
const profileForm = document.querySelector('#profileForm');
const signupStatus = document.querySelector('#signupStatus');
const loginStatus = document.querySelector('#participantLoginStatus');
const profileStatus = document.querySelector('#profileStatus');
const profileSaveBtn = document.querySelector('#saveProfileBtn');
const staffLoginForm = document.querySelector('#staffLoginForm');
function status(el, msg, error=false){ if(!el)return; el.textContent=msg; el.style.color=error?'#ff9b9b':''; }
function showView(id){ views.forEach(v=>v.classList.toggle('active',v.id===id)); navButtons.forEach(b=>b.classList.toggle('active',b.dataset.view===id)); window.scrollTo({top:0,behavior:'smooth'}); if(id==='profile') loadProfile(); if(id==='responder') refreshStaff(); }
navButtons.forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
async function currentUser(){ const {data,error}=await supabaseClient.auth.getSession(); if(error)throw error; return data.session?.user||null; }
function field(name){return profileForm.elements.namedItem(name);}
async function loadProfile(){
  try{
    const user=await currentUser();
    document.querySelector('#profileEmail').value=user?.email||'';
    if(!user){ document.querySelector('#profileSubtitle').textContent='Devam etmek için önce hesap oluştur veya giriş yap.'; status(profileStatus,'Sağlık profilini görüntülemek için önce giriş yapmalısın.',true); return; }
    document.querySelector('#profileSubtitle').textContent='Giriş açık. Bilgilerini kontrol edebilir ve güncelleyebilirsin.';
    const {data,error}=await supabaseClient.from('participant_profiles').select('id,full_name,birth_year,blood_type,allergies,medications,health_notes').eq('id',user.id).maybeSingle();
    if(error)throw error;
    if(data){field('fullName').value=data.full_name||'';field('birthYear').value=data.birth_year??'';field('bloodType').value=data.blood_type||'Bilinmiyor';field('allergies').value=data.allergies||'';field('medications').value=data.medications||'';field('notes').value=data.health_notes||'';status(profileStatus,'Kayıtlı profilin yüklendi. Değiştirip kaydettiğinde aynı kayıt güncellenir.');}
    else {field('fullName').value=user.user_metadata?.full_name||'';field('birthYear').value='';field('bloodType').value='Bilinmiyor';field('allergies').value='';field('medications').value='';field('notes').value='';status(profileStatus,'Henüz sağlık profilin yok. Bilgilerini doldurup kaydet.');}
  }catch(e){status(profileStatus,'Profil yüklenemedi: '+e.message+' | participant_profiles RLS SELECT politikasını kontrol edin.',true);}
}
signupForm.addEventListener('submit',async e=>{
  e.preventDefault(); const btn=signupForm.querySelector('button[type="submit"]'); btn.disabled=true;
  const f=new FormData(signupForm); const email=String(f.get('email')||'').trim(); const password=String(f.get('password')||'');
  try{
    if(password.length<8)throw new Error('Parola en az 8 karakter olmalı.');
    const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:'https://arda5353.github.io/NfcWebSitesi/'}});
    if(error)throw error;
    if(data.session){status(signupStatus,'Hesap oluşturuldu ve oturum açıldı. Şimdi sağlık profilini ayrı formda doldurabilirsin.'); showView('profile');}
    else {status(signupStatus,'Kayıt isteğin alındı. Lütfen e-postandaki doğrulama bağlantısına tıkla. Ardından aşağıdaki Giriş Yap bölümünden oturum aç.');}
  }catch(err){status(signupStatus,'Hesap oluşturulamadı: '+err.message,true);}finally{btn.disabled=false;}
});
loginForm.addEventListener('submit',async e=>{
  e.preventDefault(); const btn=loginForm.querySelector('button[type="submit"]'); btn.disabled=true; const f=new FormData(loginForm);
  try{const {data,error}=await supabaseClient.auth.signInWithPassword({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')}); if(error)throw error; if(!data.user?.email_confirmed_at){await supabaseClient.auth.signOut();throw new Error('Önce e-postanı doğrula, sonra yeniden giriş yap.');} status(loginStatus,'Giriş başarılı. Sağlık profilin açılıyor.'); showView('profile');}
  catch(err){status(loginStatus,'Giriş yapılamadı: '+err.message,true);}finally{btn.disabled=false;}
});
profileForm.addEventListener('submit',async e=>{
  e.preventDefault(); const btn=profileSaveBtn; btn.disabled=true;
  try{
    const user=await currentUser(); if(!user)throw new Error('Önce Hesap / Giriş bölümünden giriş yap.');
    if(!profileForm.querySelector('input[type="checkbox"]').checked)throw new Error('Test verisi onay kutusunu işaretle.');
    const fullName=String(field('fullName').value||'').trim(); if(!fullName)throw new Error('Ad soyad alanı gerekli.');
    const birthRaw=String(field('birthYear').value||'').trim(); const birthYear=birthRaw?Number(birthRaw):null;
    const row={id:user.id,full_name:fullName,birth_year:birthYear,blood_type:String(field('bloodType').value||'Bilinmiyor'),allergies:String(field('allergies').value||'').trim()||null,medications:String(field('medications').value||'').trim()||null,health_notes:String(field('notes').value||'').trim()||null};
    const {error}=await supabaseClient.from('participant_profiles').upsert(row,{onConflict:'id'}); if(error)throw error;
    status(profileStatus,'Sağlık bilgilerin veritabanına kaydedildi. Sonraki girişinde bu form otomatik doldurulur.');
  }catch(err){console.error(err);status(profileStatus,'Kaydedilemedi: '+err.message+' | participant_profiles INSERT/UPDATE RLS politikalarını kontrol edin.',true);}finally{btn.disabled=false;}
});
document.querySelector('#profileLogoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();profileForm.reset();showView('register');status(loginStatus,'Oturum kapatıldı. Yeniden giriş yapabilirsin.');});
// Staff panel: yalnızca staff_roles içinde yetkili rolü olan hesaplar listeler.
staffLoginForm.addEventListener('submit',async e=>{e.preventDefault();const btn=staffLoginForm.querySelector('button[type="submit"]');btn.disabled=true;const f=new FormData(staffLoginForm);try{const {error}=await supabaseClient.auth.signInWithPassword({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')});if(error)throw error;await refreshStaff();}catch(err){status(document.querySelector('#staffStatus'),'Giriş başarısız: '+err.message,true);}finally{btn.disabled=false;}});
async function refreshStaff(){
  const user=await currentUser().catch(()=>null); if(!user){document.querySelector('#dashboard').classList.add('hidden');document.querySelector('#loginBox').classList.remove('hidden');return;}
  const {data:role,error:roleErr}=await supabaseClient.from('staff_roles').select('role').eq('user_id',user.id).maybeSingle();
  if(roleErr||!role||!['responder','admin'].includes(role.role)){document.querySelector('#dashboard').classList.add('hidden');document.querySelector('#loginBox').classList.remove('hidden');status(document.querySelector('#staffStatus'),'Bu hesapta görevli yetkisi yok. Katılımcı hesabı görevli paneli için yeterli değildir.',true);return;}
  document.querySelector('#loginBox').classList.add('hidden');document.querySelector('#dashboard').classList.remove('hidden');const {data,error}=await supabaseClient.from('participant_profiles').select('id,full_name,birth_year,blood_type,allergies,medications,health_notes,created_at').order('created_at',{ascending:false});const list=document.querySelector('#records');
  if(error){list.textContent='Kayıtlar alınamadı. RLS SELECT politikasını kontrol edin.';return;}document.querySelector('#recordCount').textContent=data.length;
  if(!data.length){list.innerHTML='<div class="empty-state">Henüz profil yok.</div>';return;}
  list.innerHTML=data.map(p=>`<article class="record"><div class="record-head"><div><h4>${esc(p.full_name)}</h4><div class="meta">Kayıt: ${esc(p.created_at?new Date(p.created_at).toLocaleString('tr-TR'):'Tarih yok')}</div></div><span class="tag">SUPABASE</span></div><div class="record-details"><div class="detail"><small>Doğum yılı / Kan grubu</small><span>${esc(p.birth_year??'Belirtilmedi')} · ${esc(p.blood_type||'Bilinmiyor')}</span></div><div class="detail"><small>Alerjiler</small><span>${esc(p.allergies||'Belirtilmedi')}</span></div><div class="detail"><small>Düzenli ilaçlar</small><span>${esc(p.medications||'Belirtilmedi')}</span></div><div class="detail"><small>Sağlık notları</small><span>${esc(p.health_notes||'Belirtilmedi')}</span></div></div></article>`).join('');
}
document.querySelector('#staffLogoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();document.querySelector('#dashboard').classList.add('hidden');document.querySelector('#loginBox').classList.remove('hidden');});
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const params=new URLSearchParams(location.search);if(params.get('tag')){showView('register');status(signupStatus,'NFC bağlantısı algılandı. Önce hesabına giriş yap veya hesap oluştur; sağlık profilini ayrı bölümde düzenle.');}
document.querySelector('#scanBtn').addEventListener('click',async()=>{const el=document.querySelector('#scanStatus');if(!('NDEFReader'in window)){status(el,'Bu tarayıcı Web NFC desteklemiyor. iPhone’da etikete GitHub Pages URL’si yazılmalıdır.');return;}try{const reader=new NDEFReader();await reader.scan();status(el,'NFC taraması başladı.');reader.onreading=event=>{let textValue='';for(const r of event.message.records){try{if(r.recordType==='url')textValue=new TextDecoder().decode(r.data);else if(r.recordType==='text')textValue=new TextDecoder(r.encoding||'utf-8').decode(r.data);}catch{}}if(textValue){status(el,'Etiket okundu. Güvenli profil eşleştirmesi bu sürümde henüz etkin değil.');}};}catch(err){status(el,'NFC başlatılamadı: '+err.message,true);}});
document.querySelector('#manualTagForm').addEventListener('submit',e=>{e.preventDefault();status(document.querySelector('#scanStatus'),'Kod alındı. Kişi-profili eşleştirmesi için ayrıca güvenli sunucu işlemi gerekir.');});
supabaseClient.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')status(profileStatus,'Oturum kapalı. Sağlık profilini görmek için giriş yap.');});
