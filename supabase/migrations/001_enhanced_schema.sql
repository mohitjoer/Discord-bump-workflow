-- =========================================
-- DODO Dev - Complete Supabase Schema
-- Compatible with Clerk Authentication
-- =========================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- =========================================
-- 1️⃣ PROFILES TABLE (Updated for Clerk)
-- =========================================
create table profiles (
  id text primary key, -- Clerk user.id (not UUID)
  username text unique not null,
  display_name text not null,
  email text unique not null,
  bio text,
  avatar_url text,
  skills text[] default '{}',
  github_url text,
  twitter_url text,
  linkedin_url text,
  website_url text,
  role text check (role in ('student','junior','mid','senior','lead','manager','founder','other')),
  is_verified boolean default false,
  reputation integer default 0,
  follower_count integer default 0,
  following_count integer default 0,
  post_count integer default 0,
  last_active_at timestamp default now(),
  created_at timestamp default now(),
  updated_at timestamp default now(),
  
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 30),
  constraint display_name_length check (char_length(display_name) >= 1 and char_length(display_name) <= 50),
  constraint bio_length check (char_length(bio) <= 500)
);

-- =========================================
-- 2️⃣ COMMUNITIES TABLE
-- =========================================
create table communities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  banner_url text,
  category text check (category in ('frontend','backend','mobile','devops','design','data','ai','blockchain','other')),
  privacy text default 'public' check (privacy in ('public','private','restricted')),
  member_count integer default 0,
  post_count integer default 0,
  rules jsonb,
  settings jsonb,
  created_by text references profiles(id) on delete set null, -- Changed to text
  created_at timestamp default now(),
  updated_at timestamp default now(),
  
  constraint name_length check (char_length(name) >= 3 and char_length(name) <= 50),
  constraint slug_length check (char_length(slug) >= 3 and char_length(slug) <= 50),
  constraint description_length check (char_length(description) <= 1000)
);

-- =========================================
-- 3️⃣ MEMBERSHIPS TABLE
-- =========================================
create table memberships (
  user_id text references profiles(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,
  role text default 'member' check (role in ('member','moderator','admin','owner')),
  is_muted boolean default false,
  is_banned boolean default false,
  joined_at timestamp default now(),
  last_visited_at timestamp,
  primary key (user_id, community_id)
);

-- =========================================
-- 4️⃣ POSTS TABLE
-- =========================================
create table posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  user_id text references profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  content text,
  content_html text,
  type text check (type in ('discussion','question','article','showcase','help')),
  status text default 'published' check (status in ('draft','published','archived','deleted')),
  is_pinned boolean default false,
  is_locked boolean default false,
  view_count integer default 0,
  comment_count integer default 0,
  like_count integer default 0,
  share_count integer default 0,
  last_activity_at timestamp default now(),
  published_at timestamp,
  edited_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  constraint title_length check (char_length(title) >= 5 and char_length(title) <= 300),
  unique(community_id, slug)
);

-- =========================================
-- 5️⃣ COMMENTS TABLE
-- =========================================
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id text references profiles(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  content text not null,
  content_html text,
  depth integer default 0,
  is_edited boolean default false,
  is_deleted boolean default false,
  like_count integer default 0,
  reply_count integer default 0,
  edited_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  constraint content_length check (char_length(content) >= 1 and char_length(content) <= 10000),
  constraint max_depth check (depth <= 5)
);

-- =========================================
-- 6️⃣ LIKES TABLE
-- =========================================
create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  created_at timestamp default now(),
  constraint like_target check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  unique(user_id, post_id),
  unique(user_id, comment_id)
);

-- =========================================
-- 7️⃣ FOLLOWS TABLE
-- =========================================
create table follows (
  follower_id text references profiles(id) on delete cascade,
  following_id text references profiles(id) on delete cascade,
  created_at timestamp default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

-- =========================================
-- 8️⃣ NOTIFICATIONS TABLE
-- =========================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id) on delete cascade,
  type text not null check (type in ('comment','like','follow','mention','post_reply','community_invite','badge_earned')),
  title text not null,
  message text,
  link text,
  is_read boolean default false,
  metadata jsonb,
  created_at timestamp default now()
);

-- =========================================
-- 9️⃣ TAGS & POST_TAGS
-- =========================================
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  color text,
  icon text,
  usage_count integer default 0,
  created_at timestamp default now(),
  constraint tag_name_format check (name ~ '^[a-zA-Z0-9\s\-\+\#]+$'),
  constraint slug_format check (slug ~ '^[a-z0-9-]+$')
);

create table post_tags (
  post_id uuid references posts(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  created_at timestamp default now(),
  primary key (post_id, tag_id)
);

-- =========================================
-- 10️⃣ BADGES & USER_BADGES
-- =========================================
create table badges (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  icon text,
  type text check (type in ('bronze','silver','gold','special')),
  criteria jsonb,
  created_at timestamp default now()
);

create table user_badges (
  user_id text references profiles(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  earned_at timestamp default now(),
  primary key (user_id, badge_id)
);

-- =========================================
-- 11️⃣ EVENTS & EVENT_PARTICIPANTS
-- =========================================
create table events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  created_by text references profiles(id) on delete set null,
  title text not null,
  description text,
  event_type text check (event_type in ('webinar','hackathon','meetup','workshop','conference')),
  start_time timestamp not null,
  end_time timestamp,
  timezone text default 'UTC',
  location text,
  meeting_link text,
  max_participants integer,
  participant_count integer default 0,
  is_online boolean default true,
  is_cancelled boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table event_participants (
  user_id text references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  status text default 'registered' check (status in ('registered','attended','cancelled')),
  registered_at timestamp default now(),
  primary key (user_id, event_id)
);

-- =========================================
-- 12️⃣ RESOURCES TABLE
-- =========================================
create table resources (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  created_by text references profiles(id) on delete set null,
  title text not null,
  description text,
  url text not null,
  resource_type text check (resource_type in ('article','video','course','book','tool','documentation')),
  difficulty text check (difficulty in ('beginner','intermediate','advanced')),
  is_free boolean default true,
  upvote_count integer default 0,
  created_at timestamp default now()
);

-- =========================================
-- 13️⃣ INDEXES
-- =========================================
-- Profiles
create index idx_profiles_username on profiles(username);
create index idx_profiles_reputation on profiles(reputation desc);
create index idx_profiles_last_active on profiles(last_active_at desc);

-- Communities
create index idx_communities_slug on communities(slug);
create index idx_communities_category on communities(category);
create index idx_communities_member_count on communities(member_count desc);

-- Posts
create index idx_posts_community_id on posts(community_id);
create index idx_posts_user_id on posts(user_id);
create index idx_posts_status on posts(status);
create index idx_posts_type on posts(type);
create index idx_posts_last_activity on posts(last_activity_at desc);
create index idx_posts_created_at on posts(created_at desc);
create index idx_posts_title_trgm on posts using gin(title gin_trgm_ops);

-- Comments
create index idx_comments_post_id on comments(post_id);
create index idx_comments_user_id on comments(user_id);
create index idx_comments_parent_id on comments(parent_id);
create index idx_comments_created_at on comments(created_at desc);

-- Likes
create index idx_likes_post_id on likes(post_id);
create index idx_likes_comment_id on likes(comment_id);
create index idx_likes_user_id on likes(user_id);

-- Notifications
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_is_read on notifications(is_read);
create index idx_notifications_created_at on notifications(created_at desc);

-- Tags
create index idx_tags_name on tags(name);
create index idx_tags_slug on tags(slug);
create index idx_tags_usage_count on tags(usage_count desc);

-- Post Tags
create index idx_post_tags_post_id on post_tags(post_id);
create index idx_post_tags_tag_id on post_tags(tag_id);

-- Memberships
create index idx_memberships_user_id on memberships(user_id);
create index idx_memberships_community_id on memberships(community_id);
create index idx_memberships_role on memberships(role);

-- Follows
create index idx_follows_follower_id on follows(follower_id);
create index idx_follows_following_id on follows(following_id);

-- Events
create index idx_events_community_id on events(community_id);
create index idx_events_start_time on events(start_time);

-- Event Participants
create index idx_event_participants_user_id on event_participants(user_id);
create index idx_event_participants_event_id on event_participants(event_id);

-- Resources
create index idx_resources_community_id on resources(community_id);
create index idx_resources_resource_type on resources(resource_type);

-- User Badges
create index idx_user_badges_user_id on user_badges(user_id);
create index idx_user_badges_badge_id on user_badges(badge_id);

-- =========================================
-- ✅ SCHEMA COMPLETE
-- =========================================