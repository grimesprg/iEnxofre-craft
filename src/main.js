import { createClient } from '@supabase/supabase-js';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured = Boolean(url && anon && !url.includes('SEU-PROJETO') && !anon.includes('SUA_CHAVE'));
const supabase = configured ? createClient(url, anon) : null;

const PIX_KEY = 'f4953de0-4a43-480e-84bf-1b87137e5773';
const defaultSettings = {
  store_name: 'Enxofre Craft', accent_color: '#8b45c6', background_color: '#120d18',
  banner_title: 'SUA JORNADA COMEÇA AQUI.',
  banner_subtitle: 'Encontre os melhores kits para sua aventura.',
  banner_image_url: '', discord_url: '', pix_key: PIX_KEY
};
let settings = {...defaultSettings}, user = null, isAdmin = false;
let products = [], cart = JSON.parse(localStorage.getItem('enxofre-cart') || '[]');
let adminOpen = false, cartOpen = false, orders = [];

const money = n => Number(n || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app = document.querySelector('#app');

function saveCart(){ localStorage.setItem('enxofre-cart', JSON.stringify(cart)); }
function applyTheme(){
  document.documentElement.style.setProperty('--accent', settings.accent_color || '#8b45c6');
  document.documentElement.style.setProperty('--page', settings.background_color || '#120d18');
}
function toast(msg){ const el=document.querySelector('#toast'); if(el){el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);} }
function cartTotal(){ return cart.reduce((s,x)=>s + Number(x.price)*x.qty,0); }

async function loadData(){
  if(!configured) return;
  const [{data:st},{data:pr}] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id',1).maybeSingle(),
    supabase.from('products').select('*').order('created_at',{ascending:false})
  ]);
  if(st) settings = {...defaultSettings,...st};
  products = pr || [];
  applyTheme();
}
async function checkUser(){
  if(!configured) return;
  const {data:{session}} = await supabase.auth.getSession();
  user = session?.user || null;
  if(user){
    const {data} = await supabase.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    isAdmin = Boolean(data);
  } else isAdmin=false;
}
async function signIn(){
  if(!configured) return toast('Configure o Supabase primeiro.');
  const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});
  if(error) toast(error.message);
}
async function signOut(){ await supabase.auth.signOut(); user=null; isAdmin=false; adminOpen=false; render(); }

function render(){
  applyTheme();
  const activeProducts=products.filter(p=>p.active);
  app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#"><span class="brand-mark">✦</span><span><b>${esc(settings.store_name)}</b><small>LOJA OFICIAL</small></span></a>
    <nav><button class="nav-btn" id="cartBtn">Carrinho <span class="count">${cart.reduce((s,x)=>s+x.qty,0)}</span></button>
    ${user ? `<button class="nav-btn" id="accountBtn">${esc(user.user_metadata?.full_name || user.email || 'Conta')}</button>` : `<button class="nav-btn" id="loginBtn">Entrar com Google</button>`}
    ${isAdmin ? `<button class="primary small" id="adminBtn">Painel admin</button>`:''}
    ${user ? `<button class="nav-btn" id="logoutBtn" aria-label="Sair">Sair</button>`:''}
    </nav>
  </header>
  <main>
    <section class="hero" style="${settings.banner_image_url ? `background-image:linear-gradient(90deg,rgba(15,8,22,.94),rgba(15,8,22,.48)),url('${esc(settings.banner_image_url)}')` : ''}">
      <div class="hero-content"><span class="eyebrow">ENXOFRE CRAFT • BEDROCK</span><h1>${esc(settings.banner_title)}</h1>
      <p>${esc(settings.banner_subtitle)}</p><a class="primary link-btn" href="#kits">Explorar kits</a></div>
      <div class="hero-orb">E</div>
    </section>
    <section class="section" id="kits"><div class="section-heading"><div><span class="eyebrow">ESCOLHA SEU EQUIPAMENTO</span><h2>Kits disponíveis</h2></div><span class="muted">${activeProducts.length} produto(s)</span></div>
      ${activeProducts.length ? `<div class="products">${activeProducts.map(p=>`<article class="product">
        <div class="product-image">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" onerror="this.style.display='none'">` : '<span>✦</span>'}</div>
        <div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="product-bottom"><b>${money(p.price)}</b><button class="primary add-btn" data-add="${p.id}">Adicionar</button></div></div>
      </article>`).join('')}</div>` : `<div class="empty"><span>✦</span><h3>A loja está sendo preparada</h3><p>Novos kits aparecerão aqui em breve.</p></div>`}
    </section>
    <section class="support"><div><span class="eyebrow">PRECISA DE AJUDA?</span><h2>Entre na comunidade</h2><p>Acompanhe novidades e fale com a equipe.</p></div><a class="outline-btn" href="${esc(settings.discord_url || '#')}" target="_blank" rel="noreferrer">Acessar Discord</a></section>
  </main>
  <footer>© ${new Date().getFullYear()} ${esc(settings.store_name)}. Todos os direitos reservados.</footer>
  ${cartOpen ? cartPanel() : ''}
  ${adminOpen && isAdmin ? adminPanel() : ''}
  <div id="toast" class="toast"></div>`;
  document.querySelector('#cartBtn').onclick=()=>{cartOpen=true;render();};
  document.querySelector('#loginBtn')?.addEventListener('click',signIn);
  document.querySelector('#logoutBtn')?.addEventListener('click',signOut);
  document.querySelector('#adminBtn')?.addEventListener('click',()=>{adminOpen=true;cartOpen=false;render();});
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
  document.querySelector('#closeCart')?.addEventListener('click',()=>{cartOpen=false;render();});
  document.querySelector('#closeAdmin')?.addEventListener('click',()=>{adminOpen=false;render();});
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart=cart.filter(x=>x.id!==b.dataset.remove);saveCart();render();});
  document.querySelectorAll('[data-qty]').forEach(b=>b.onclick=()=>{const item=cart.find(x=>x.id===b.dataset.qty);if(item){item.qty=Math.max(1,item.qty+Number(b.dataset.delta));saveCart();render();}});
  document.querySelector('#checkout')?.addEventListener('click',checkout);
  document.querySelector('#copyPix')?.addEventListener('click',()=>{navigator.clipboard.writeText(settings.pix_key || PIX_KEY).then(()=>toast('Chave PIX copiada.'));});
  document.querySelector('#saveSettings')?.addEventListener('click',saveSettings);
  document.querySelector('#addProduct')?.addEventListener('click',()=>saveProduct());
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
  document.querySelectorAll('[data-status]').forEach(s=>s.onchange=()=>updateOrder(s.dataset.status,s.value));
}
function addToCart(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const old=cart.find(x=>x.id===id);
  if(old)old.qty++;else cart.push({id:p.id,name:p.name,price:p.price,qty:1});
  saveCart();render();toast('Produto adicionado ao carrinho.');
}
function cartPanel(){
  return `<div class="overlay" id="cartOverlay"><aside class="drawer"><div class="drawer-head"><h2>Seu carrinho</h2><button class="icon-btn" id="closeCart">✕</button></div>
  ${cart.length ? `<div class="cart-items">${cart.map(x=>`<div class="cart-row"><div><b>${esc(x.name)}</b><small>${money(x.price)} cada</small><div class="qty"><button data-qty="${x.id}" data-delta="-1">−</button><span>${x.qty}</span><button data-qty="${x.id}" data-delta="1">+</button></div></div><div class="cart-right"><b>${money(x.price*x.qty)}</b><button class="remove" data-remove="${x.id}">Remover</button></div></div>`).join('')}</div>
  <div class="checkout-box"><div class="total"><span>Total</span><b>${money(cartTotal())}</b></div><p class="muted">Para finalizar, entre com sua conta Google.</p><button class="primary full" id="checkout">Finalizar pedido</button><div class="pix-line"><span>PIX da loja</span><code>${esc(settings.pix_key || PIX_KEY)}</code><button id="copyPix" class="outline-btn">Copiar chave</button></div></div>` : `<div class="empty"><h3>Seu carrinho está vazio</h3><p>Adicione um kit para continuar.</p></div>`}</aside></div>`;
}
function adminPanel(){
  return `<div class="overlay"><aside class="drawer admin-drawer"><div class="drawer-head"><div><span class="eyebrow">ÁREA RESTRITA</span><h2>Painel administrativo</h2></div><button class="icon-btn" id="closeAdmin">✕</button></div>
  <div class="admin-tabs"><a href="#admin-products">Produtos</a><a href="#admin-settings">Personalização</a><a href="#admin-orders">Pedidos</a></div>
  <section id="admin-products" class="admin-section"><h3>Gerenciar kits</h3><div class="admin-form">
    <input id="pName" placeholder="Nome do kit"><textarea id="pDesc" placeholder="Descrição"></textarea>
    <input id="pPrice" type="number" min="0" step="0.01" placeholder="Preço (ex.: 21.00)">
    <input id="pImage" placeholder="URL da imagem do kit">
    <button class="primary full" id="addProduct">Adicionar kit</button></div>
    <div class="admin-list">${products.map(p=>`<div class="admin-product"><div><b>${esc(p.name)}</b><small>${money(p.price)} • ${p.active?'Visível':'Oculto'}</small></div><div><button class="outline-btn" data-edit="${p.id}">Editar</button><button class="remove" data-delete="${p.id}">Excluir</button></div></div>`).join('') || '<p class="muted">Nenhum kit cadastrado.</p>'}</div>
  </section>
  <section id="admin-settings" class="admin-section"><h3>Personalizar loja</h3><div class="admin-form">
    <label>Nome da loja<input id="sName" value="${esc(settings.store_name)}"></label>
    <label>Cor principal<input id="sAccent" type="color" value="${esc(settings.accent_color)}"></label>
    <label>Cor de fundo<input id="sBg" type="color" value="${esc(settings.background_color)}"></label>
    <label>Título do banner<input id="sTitle" value="${esc(settings.banner_title)}"></label>
    <label>Subtítulo<input id="sSubtitle" value="${esc(settings.banner_subtitle)}"></label>
    <label>Imagem do banner (URL)<input id="sBanner" value="${esc(settings.banner_image_url)}"></label>
    <label>Link do Discord<input id="sDiscord" value="${esc(settings.discord_url)}"></label>
    <label>Chave PIX<input id="sPix" value="${esc(settings.pix_key)}"></label>
    <button class="primary full" id="saveSettings">Salvar personalização</button></div>
  </section>
  <section id="admin-orders" class="admin-section"><h3>Pedidos recentes</h3><div id="ordersList" class="admin-list">${orders.map(o=>`<div class="admin-product"><div><b>${money(o.total)} • ${esc(o.customer_name || 'Cliente')}</b><small>${new Date(o.created_at).toLocaleString('pt-BR')} • ${esc(o.status)}</small></div><select data-status="${o.id}"><option value="aguardando_pagamento" ${o.status==='aguardando_pagamento'?'selected':''}>Aguardando</option><option value="pago" ${o.status==='pago'?'selected':''}>Pago</option><option value="entregue" ${o.status==='entregue'?'selected':''}>Entregue</option><option value="cancelado" ${o.status==='cancelado'?'selected':''}>Cancelado</option></select></div>`).join('') || '<p class="muted">Nenhum pedido ainda.</p>'}</div></section>
  </aside></div>`;
}
async function checkout(){
  if(!user){await signIn();return;}
  if(!cart.length)return;
  const payload={user_id:user.id,customer_name:user.user_metadata?.full_name || user.email || '',items:cart.map(x=>({id:x.id,name:x.name,price:Number(x.price),quantity:x.qty})),total:cartTotal()};
  const {error}=await supabase.from('orders').insert(payload);
  if(error){toast('Não foi possível criar o pedido: '+error.message);return;}
  cart=[];saveCart();toast('Pedido criado! Faça o pagamento via PIX e envie o comprovante pelo Discord.');cartOpen=false;render();
}
async function saveProduct(existingId=null){
  const name=document.querySelector('#pName')?.value.trim(), description=document.querySelector('#pDesc')?.value.trim(), price=Number(document.querySelector('#pPrice')?.value), image_url=document.querySelector('#pImage')?.value.trim();
  if(!name || !Number.isFinite(price) || price<0)return toast('Informe nome e preço válido.');
  const payload={name,description,price,image_url,active:true,updated_at:new Date().toISOString()};
  const query=existingId ? supabase.from('products').update(payload).eq('id',existingId) : supabase.from('products').insert(payload);
  const {error}=await query;
  if(error)return toast(error.message);
  await loadData();render();toast('Kit salvo.');
}
async function editProduct(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  const name=prompt('Nome do kit:',p.name);if(name===null)return;
  const description=prompt('Descrição:',p.description);if(description===null)return;
  const price=Number(prompt('Preço:',p.price));if(!Number.isFinite(price)||price<0)return toast('Preço inválido.');
  const image_url=prompt('URL da imagem:',p.image_url);if(image_url===null)return;
  const {error}=await supabase.from('products').update({name,description,price,image_url,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return toast(error.message);
  await loadData();render();toast('Kit atualizado.');
}
async function deleteProduct(id){
  if(!confirm('Excluir este kit?'))return;
  const {error}=await supabase.from('products').delete().eq('id',id);
  if(error)return toast(error.message);
  await loadData();render();toast('Kit removido.');
}
async function saveSettings(){
  const payload={store_name:document.querySelector('#sName').value,accent_color:document.querySelector('#sAccent').value,background_color:document.querySelector('#sBg').value,banner_title:document.querySelector('#sTitle').value,banner_subtitle:document.querySelector('#sSubtitle').value,banner_image_url:document.querySelector('#sBanner').value,discord_url:document.querySelector('#sDiscord').value,pix_key:document.querySelector('#sPix').value,updated_at:new Date().toISOString()};
  const {error}=await supabase.from('store_settings').update(payload).eq('id',1);
  if(error)return toast(error.message);
  await loadData();render();toast('Loja atualizada para todos.');
}
async function loadOrders(){
  if(!isAdmin)return;
  const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(50);
  if(!error)orders=data||[];
}
async function updateOrder(id,status){
  const {error}=await supabase.from('orders').update({status}).eq('id',id);
  if(error)return toast(error.message);
  await loadOrders();render();toast('Status do pedido atualizado.');
}
async function start(){
  if(!configured){
    app.innerHTML=`<div class="setup"><div class="setup-card"><div class="brand-mark">✦</div><h1>Enxofre Craft</h1><h2>Seu projeto está pronto para configurar.</h2><p>Conecte seu projeto Supabase para ativar login Google, produtos compartilhados, carrinho e painel administrativo.</p><ol><li>Crie um projeto no Supabase.</li><li>Execute <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL e a chave anon/public para o arquivo <code>.env</code>.</li><li>Configure Google em Authentication → Providers.</li></ol><p class="muted">Veja o arquivo LEIA-ME.md para o passo a passo.</p></div></div>`;
    return;
  }
  await loadData();await checkUser();await loadOrders();render();
  supabase.auth.onAuthStateChange(async()=>{await checkUser();await loadOrders();render();});
  supabase.channel('store-live').on('postgres_changes',{event:'*',schema:'public',table:'products'},async()=>{await loadData();render();}).on('postgres_changes',{event:'*',schema:'public',table:'store_settings'},async()=>{await loadData();render();}).subscribe();
}
start();
