-- Add user_id to engineer_submissions to link submissions to users
ALTER TABLE public.engineer_submissions
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_engineer_submissions_user_id ON public.engineer_submissions(user_id);

-- Update RLS policy to allow users to view their own submissions
CREATE POLICY "Users can view their own submissions"
ON public.engineer_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Update INSERT policy to set user_id
DROP POLICY IF EXISTS "Anyone can submit" ON public.engineer_submissions;
CREATE POLICY "Authenticated users can submit"
ON public.engineer_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add response_status column to generated_emails for tracking
ALTER TABLE public.generated_emails
ADD COLUMN response_status text DEFAULT 'not_sent' CHECK (response_status IN ('not_sent', 'sent', 'responded', 'no_response'));

-- Add user_id to generated_emails
ALTER TABLE public.generated_emails
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user lookups
CREATE INDEX idx_generated_emails_user_id ON public.generated_emails(user_id);

-- Update RLS for generated_emails to be user-specific
DROP POLICY IF EXISTS "Generated emails are readable" ON public.generated_emails;
CREATE POLICY "Users can view their own emails"
ON public.generated_emails
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own email status
CREATE POLICY "Users can update their own email status"
ON public.generated_emails
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update insert policy
DROP POLICY IF EXISTS "System can insert emails" ON public.generated_emails;
CREATE POLICY "Users can insert their own emails"
ON public.generated_emails
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);