-- Add used_storage column to profiles to track bytes used by user attachments
alter table if exists profiles
add column if not exists used_storage bigint not null default 0;
