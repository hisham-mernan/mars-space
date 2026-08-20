import { redirect } from 'next/navigation';

/**
 * Self-registration was removed when auth moved to Supabase.
 *
 * Membership is invite-only: Mars Space provisions the account when a contract
 * is signed, and the member sets their own password from the invite email
 * (see /auth/set-password). Public signup is also disabled at the Supabase
 * project level, so this page could not create an account even if it tried.
 *
 * Kept as a redirect rather than deleted so existing links and bookmarks land
 * on the enquiry form instead of a 404.
 */
export default function Register() {
  redirect('/contact?type=membership');
}
