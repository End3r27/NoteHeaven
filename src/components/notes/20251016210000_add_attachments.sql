-- Migration: Create attachments table for note file uploads
create table if not exists attachments (
	id uuid default gen_random_uuid() primary key,
	user_id uuid references profiles(id) on delete cascade,
	note_id uuid references notes(id) on delete cascade,
	filename text not null,
	file_url text not null,
	filesize bigint not null,
	uploaded_at timestamptz default now()
);
