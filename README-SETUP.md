# Comunidade Master Mind - Setup rápido

## Arquivos do projeto
- index.html
- style.css
- app.js
- supabase_schema.sql

## Passo a passo
1. Crie um projeto no Supabase.
2. No SQL Editor, rode o arquivo `supabase_schema.sql`.
3. Em `app.js`, cole:
   - sua `SUPABASE_URL`
   - sua `SUPABASE_ANON_KEY`
4. Suba os arquivos para o GitHub Pages.
5. Crie sua conta pelo app.
6. No SQL Editor, rode:

```sql
update public.profiles
set role = 'admin', access_level = 'vip'
where email = 'SEU_EMAIL_AQUI';
```

## O que o sistema já faz
- cadastro e login
- perfil de membro
- acesso iniciante, vip e admin
- mural da comunidade
- cadastro e vitrine de produtos
- cadastro e biblioteca de materiais
- painel admin para mudar acesso e função de membros

## Observação
Para produção, o ideal é evoluir depois para Edge Functions ou backend próprio em operações administrativas mais sensíveis.
