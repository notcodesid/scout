const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YCCompany {
  id: number;
  name: string;
  slug: string;
  website: string;
  all_locations: string;
  long_description: string;
  one_liner: string;
  team_size: number;
  industry: string;
  subindustry?: string;
  tags: string[];
  batch: string;
  status: string;
  launched_at: number;
  isHiring: boolean;
  small_logo_thumb_url?: string;
  url?: string;
}

interface TransformedStartup {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  website: string;
  tags: string[];
  founded: string;
  teamSize: number;
  location: string;
  batch: string;
  industry: string;
  subindustry?: string;
  isHiring: boolean;
  logoUrl?: string;
  ycUrl?: string;
  founders: { name: string; linkedin?: string }[];
}

function extractYear(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.getFullYear().toString();
}

function transformCompany(company: YCCompany): TransformedStartup {
  return {
    id: company.id.toString(),
    name: company.name,
    description: company.one_liner || company.long_description?.substring(0, 200) || '',
    longDescription: company.long_description,
    website: company.website || `https://www.ycombinator.com/companies/${company.slug}`,
    tags: company.tags || [],
    founded: extractYear(company.launched_at),
    teamSize: company.team_size || 0,
    location: company.all_locations || 'Unknown',
    batch: company.batch || '',
    industry: company.industry || 'Technology',
    subindustry: company.subindustry,
    isHiring: company.isHiring || false,
    logoUrl: company.small_logo_thumb_url,
    ycUrl: company.url || `https://www.ycombinator.com/companies/${company.slug}`,
    founders: [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startupId = searchParams.get('id');

    if (!startupId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Startup ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching startup details for ID: ${startupId}`);

    // Fetch from the YC OSS API - we need to search through hiring companies
    const apiUrl = 'https://yc-oss.github.io/api/companies/hiring.json';
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch from YC API: ${response.status}`);
      throw new Error(`Failed to fetch from YC API: ${response.status}`);
    }

    const companies: YCCompany[] = await response.json();
    
    // Find the specific company by ID
    const company = companies.find(c => c.id.toString() === startupId);

    if (!company) {
      console.log(`Startup with ID ${startupId} not found`);
      return new Response(
        JSON.stringify({ success: false, error: 'Startup not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startup = transformCompany(company);

    // Find related startups (same industry or shared tags)
    const relatedCompanies = companies
      .filter(c => c.id !== company.id)
      .filter(c => 
        c.industry === company.industry || 
        c.tags?.some(tag => company.tags?.includes(tag))
      )
      .slice(0, 3)
      .map(transformCompany);

    console.log(`Found startup: ${startup.name}, with ${relatedCompanies.length} related companies`);

    return new Response(
      JSON.stringify({
        success: true,
        data: startup,
        related: relatedCompanies,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching startup:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch startup',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
