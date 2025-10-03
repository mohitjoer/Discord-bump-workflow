import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function SelectRedirectPage() {
  const { userId } = await auth();
  
  // If no user is authenticated, redirect to sign-in
  if (!userId) {
    redirect("/sign-in");
  }

  try {
    // Check if user has a profile in the database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .single();

    // If error occurs (including no profile found), redirect to onboarding
    if (error || !profile) {
      console.log('No profile found for user:', userId, 'Error:', error?.message);
      redirect("/onboarding");
    }
  } catch (error) {
    console.error('Error checking profile:', error);
    // On any error, redirect to onboarding to be safe
    redirect("/onboarding");
  }
}