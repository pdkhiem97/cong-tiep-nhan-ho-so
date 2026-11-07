-- Thông tin khách tiềm năng do Gemini trích xuất từ hội thoại. Mỗi hội thoại có tối đa một lead.
-- Dữ liệu riêng tư: chỉ server truy cập bằng secret key.
create table public.leads (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  name text,
  email text,
  phone text,
  country text,
  study_level text,
  major text,
  availability text,
  wants_consultation boolean,
  note text,
  quality text not null check (quality in ('good', 'ok', 'spam')),
  extracted_at timestamptz not null default now()
);

-- Bật RLS và cố ý không tạo policy nào: publishable key không đọc hay ghi được.
alter table public.leads enable row level security;

-- Lớp bảo vệ thứ hai: thu hồi luôn quyền của các vai trò dùng từ trình duyệt.
revoke all on table public.leads from anon, authenticated;

grant select, insert, update, delete on table public.leads to service_role;
