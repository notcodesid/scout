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
  tags: string[];
  batch: string;
  status: string;
  launched_at: number;
  isHiring: boolean;
  small_logo_thumb_url?: string;
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
  isHiring: boolean;
  logoUrl?: string;
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
    isHiring: company.isHiring || false,
    logoUrl: company.small_logo_thumb_url,
    founders: [], // YC API doesn't provide founder info in the companies list
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'hiring';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const industry = searchParams.get('industry');
    const search = searchParams.get('search');

    console.log(`Fetching YC startups: category=${category}, limit=${limit}, offset=${offset}, industry=${industry}, search=${search}`);

    // Fetch from the YC OSS API
    const apiUrl = `https://yc-oss.github.io/api/companies/${category}.json`;
    
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
    console.log(`Fetched ${companies.length} companies from YC API`);

    // Transform the data
    let startups = companies.map(transformCompany);

    // Apply industry filter
    if (industry && industry !== 'all') {
      startups = startups.filter((startup) =>
        startup.industry.toLowerCase().includes(industry.toLowerCase()) ||
        startup.tags.some((tag) => tag.toLowerCase().includes(industry.toLowerCase()))
      );
    }

    // Apply search filter
    if (search) {
      const query = search.toLowerCase();
      startups = startups.filter(
        (startup) =>
          startup.name.toLowerCase().includes(query) ||
          startup.description.toLowerCase().includes(query) ||
          startup.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply pagination
    const paginatedStartups = startups.slice(offset, offset + limit);
    const hasMore = offset + limit < startups.length;

    console.log(`Returning ${paginatedStartups.length} startups (offset: ${offset}, hasMore: ${hasMore})`);

    return new Response(
      JSON.stringify({
        success: true,
        data: paginatedStartups,
        total: startups.length,
        offset,
        limit,
        hasMore,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching YC startups:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch startups',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
