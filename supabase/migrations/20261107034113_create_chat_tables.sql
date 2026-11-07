-- Hội thoại chatbot của khách. Dữ liệu riêng tư: chỉ server truy cập bằng secret key.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('user', 'bot')),
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

create index messages_conversation_id_id_idx on public.messages (conversation_id, id);

-- Bật RLS và cố ý không tạo policy nào: publishable key không đọc hay ghi được.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Lớp bảo vệ thứ hai: thu hồi luôn quyền của các vai trò dùng từ trình duyệt.
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select, insert, update, delete on table public.conversations to service_role;
grant select, insert, update, delete on table public.messages to service_role;
