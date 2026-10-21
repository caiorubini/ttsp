// Projeto Supabase do ttsp. A URL e a chave pública (anon ou publishable) são públicas por desenho:
// quem protege os dados é a política de acesso por usuário (RLS) e, acima dela, a criptografia feita no aparelho.
// Nunca coloque aqui a chave service_role.
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''

export const syncConfigured = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY
