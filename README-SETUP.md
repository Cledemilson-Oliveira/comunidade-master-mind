1. No Supabase, crie um projeto.
2. Abra o SQL Editor e rode o arquivo supabase_schema.sql.
3. No app.js, cole sua SUPABASE_URL e sua SUPABASE_ANON_KEY.
4. Suba estes arquivos no GitHub:
   - index.html
   - style.css
   - app.js
5. Depois de criar sua primeira conta, rode este SQL para virar admin:
   update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
