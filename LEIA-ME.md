# Enxofre Craft — loja virtual

Projeto inicial com Vite + Supabase, preparado para publicar na Vercel.

## O que já está incluído
- Loja pública roxa e responsiva.
- Produtos lidos do Supabase; alterações aparecem para os visitantes.
- Carrinho salvo no navegador.
- Login Google via Supabase Auth.
- Painel administrativo protegido por políticas RLS do banco.
- Cadastro, edição e exclusão de kits.
- Personalização do nome, cores, banner, Discord e chave PIX.
- Criação de pedidos e atualização de status pelo admin.
- Atualizações em tempo real para produtos e configurações.

## 1. Criar o Supabase
1. Crie um projeto em https://supabase.com.
2. Abra SQL Editor e execute todo o arquivo `supabase/schema.sql`.
3. Em Project Settings > API, copie Project URL e `anon`/publishable key.
4. Crie `.env` na raiz copiando `.env.example` e preencha os dois valores.
5. Em Authentication > URL Configuration, adicione a URL local `http://localhost:5173` e depois a URL pública da Vercel.

## 2. Login Google
1. No Google Cloud Console, crie um projeto e configure OAuth consent screen.
2. Crie credenciais OAuth do tipo Web application.
3. Em Authorized redirect URIs, copie exatamente a Callback URL mostrada em Supabase > Authentication > Providers > Google.
4. Cole Client ID e Client Secret no provedor Google do Supabase e habilite-o.
5. Para produção, configure domínio e URLs autorizadas no Google e no Supabase.

## 3. Tornar sua conta administradora
1. Inicie a loja e faça login com sua conta Google.
2. No Supabase, abra Authentication > Users e copie o UUID dessa conta.
3. No SQL Editor execute:
   `insert into public.admin_users (user_id) values ('COLE-SEU-UUID') on conflict do nothing;`
4. Atualize a loja. O botão “Painel admin” aparecerá apenas para essa conta.
5. Não compartilhe o acesso dessa conta. A autorização é conferida no banco, não por uma senha escrita no HTML.

## 4. Rodar no computador
Requer Node.js instalado:
```bash
npm install
npm run dev
```
Abra o endereço local indicado pelo Vite.

## 5. Publicar na Vercel
1. Envie a pasta do projeto para um repositório GitHub.
2. Na Vercel, importe esse repositório.
3. Framework: Vite. Build command: `npm run build`. Output directory: `dist`.
4. Em Project Settings > Environment Variables, cadastre:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Faça Deploy e cadastre o domínio da Vercel nas URLs permitidas do Supabase e do Google OAuth.
6. Depois de alterar variáveis, faça um novo deploy.

## Segurança e limites importantes
- A chave `anon`/publishable do Supabase pode estar no frontend; a segurança depende das políticas RLS incluídas no SQL.
- NUNCA coloque a `service_role` key no `.env` do frontend, GitHub ou Vercel como variável `VITE_`.
- Configure MFA na conta Google que será administradora.
- A chave PIX está preenchida no projeto porque foi fornecida para exibição. Confirme se deseja deixá-la pública antes de publicar.
- Este projeto registra pedidos e mostra a chave PIX, mas NÃO confirma pagamentos automaticamente. O admin deve conferir o pagamento por um canal oficial antes de marcar como pago/entregue.
- Para pagamentos automáticos, será necessário integrar um provedor de pagamentos com backend seguro/webhook. Não coloque segredos de pagamento no navegador.
- A criação/gestão de pagamentos deve ser feita com acompanhamento de um responsável adulto.
- Imagens são adicionadas por URL pública; não há upload de arquivos nesta primeira versão.
