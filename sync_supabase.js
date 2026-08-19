import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nkcimscbmgodptmvefhg.supabase.co';
const supabaseKey = 'sb_publishable_nwdcoIa3afU6stC3ejBJ0Q_A_LYPKw6';

const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  {
    email: 'priya.sharma@university.edu',
    password: 'Faculty@123',
    personId: 'a1000000-0000-0000-0000-000000000001',
    role: 'faculty',
  },
  {
    email: 'arjun.mehta@student.edu',
    password: 'TeamLead@123',
    personId: 'a1000000-0000-0000-0000-000000000002',
    role: 'team_lead',
  },
  {
    email: 'sneha.patel@student.edu',
    password: 'Volunteer@123',
    personId: 'a1000000-0000-0000-0000-000000000003',
    role: 'volunteer',
  },
  {
    email: 'ravi.kumar@student.edu',
    password: 'Volunteer@123',
    personId: 'a1000000-0000-0000-0000-000000000004',
    role: 'volunteer',
  },
];

async function run() {
  console.log('--- 1. Fetching current public.users and public.persons ---');
  const { data: persons, error: pErr } = await supabase.from('persons').select('*');
  if (pErr) console.error('Persons fetch error:', pErr);
  else console.log('Persons in DB:', persons?.map(p => ({ id: p.id, name: p.full_name, email: p.email })));

  const { data: users, error: uErr } = await supabase.from('users').select('*, role:roles(*), person:persons(*)');
  if (uErr) console.error('Users fetch error:', uErr);
  else console.log('Users in DB:', users);

  console.log('\n--- 2. Creating/Signing up accounts in Supabase Auth ---');
  const createdMappings = [];

  for (const acc of accounts) {
    console.log(`\nProcessing ${acc.email}...`);
    // Try sign in first in case account already exists
    let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    let authUserId = signInData?.user?.id;

    if (!authUserId) {
      // Create account
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: acc.email,
        password: acc.password,
      });

      if (signUpErr) {
        console.error(`SignUp error for ${acc.email}:`, signUpErr.message);
      } else {
        authUserId = signUpData?.user?.id;
        console.log(`Successfully created Auth user for ${acc.email} -> auth_user_id: ${authUserId}`);
      }
    } else {
      console.log(`Auth user already exists for ${acc.email} -> auth_user_id: ${authUserId}`);
    }

    if (authUserId) {
      createdMappings.push({
        email: acc.email,
        authUserId,
        personId: acc.personId,
        role: acc.role,
      });
    }
  }

  console.log('\n--- Created Auth Mappings ---');
  console.log(createdMappings);
}

run();
