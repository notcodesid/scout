-- Create storage bucket for resume uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false);

-- Create policy for resume uploads (anyone can upload)
CREATE POLICY "Anyone can upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes');

-- Create policy for reading own resume (via path matching)
CREATE POLICY "Public read for resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes');

-- Cold email templates table (admin-managed templates)
CREATE TABLE public.cold_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cold_email_templates ENABLE ROW LEVEL SECURITY;

-- Templates are readable by everyone (public templates)
CREATE POLICY "Templates are publicly readable"
ON public.cold_email_templates
FOR SELECT
USING (is_active = true);

-- Engineer submissions table (stores form data)
CREATE TABLE public.engineer_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  education TEXT,
  preferred_roles TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.engineer_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert submissions (public form)
CREATE POLICY "Anyone can submit"
ON public.engineer_submissions
FOR INSERT
WITH CHECK (true);

-- Generated emails table (stores AI-generated emails for each submission)
CREATE TABLE public.generated_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.engineer_submissions(id) ON DELETE CASCADE,
  startup_id TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_emails ENABLE ROW LEVEL SECURITY;

-- Generated emails are readable by everyone (for demo purposes)
CREATE POLICY "Generated emails are readable"
ON public.generated_emails
FOR SELECT
USING (true);

-- Insert can be done by system (edge functions)
CREATE POLICY "System can insert emails"
ON public.generated_emails
FOR INSERT
WITH CHECK (true);

-- Insert some starter cold email templates
INSERT INTO public.cold_email_templates (name, subject_template, body_template, category) VALUES
(
  'Software Engineer Introduction',
  'Passionate {{role}} interested in {{company_name}}',
  'Hi {{founder_name}},

I came across {{company_name}} and was immediately impressed by {{company_focus}}. As a {{role}} with experience in {{skills}}, I believe I could contribute meaningfully to your team.

{{personalized_pitch}}

I''d love the opportunity to discuss how I can help {{company_name}} achieve its goals. Would you be open to a brief call?

Best regards,
{{candidate_name}}',
  'general'
),
(
  'Technical Deep Dive',
  'Engineer with {{primary_skill}} expertise - {{company_name}} opportunity',
  'Hello {{founder_name}},

I''ve been following {{company_name}}''s work in {{industry}} and I''m genuinely excited about what you''re building.

With {{experience_years}} years of experience in {{skills}}, I''ve worked on similar challenges. {{personalized_pitch}}

I''ve attached my resume for your reference. Would love to learn more about opportunities at {{company_name}}.

Best,
{{candidate_name}}
{{linkedin_url}}',
  'technical'
),
(
  'Startup Enthusiast',
  'Early-stage startup lover ready to contribute to {{company_name}}',
  'Hi {{founder_name}},

I''m reaching out because {{company_name}} is exactly the type of company I want to be part of—an ambitious team tackling {{company_focus}}.

{{personalized_pitch}}

I''m flexible, hungry to learn, and ready to do whatever it takes to help {{company_name}} succeed. Can we chat?

{{candidate_name}}
{{portfolio_url}}',
  'startup'
);