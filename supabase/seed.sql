-- Seed file for development environment
-- This file is used to populate the database with test data

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create test users
-- Password for all test users: "password123"
-- Using crypt() function to generate bcrypt hash

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  aud,
  role
)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '00000000-0000-0000-0000-000000000000',
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Test User"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  ),
  (
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Admin User"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Create corresponding identity records
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","email":"test@example.com"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
    '{"sub":"b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22","email":"admin@example.com"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;
