-- Local PostgreSQL-only harness: Supabase Auth stand-ins (do NOT deploy).
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY,
 email_confirmed_at timestamptz
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
