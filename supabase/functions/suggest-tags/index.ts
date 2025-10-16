import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, language = 'en' } = await req.json();
    
    if (!title || !body || title.trim().length === 0 || body.trim().length === 0) {
      throw new Error('Title and content are required for tag suggestions');
    }
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get existing tags
    const { data: existingTags } = await supabase
      .from('tags')
      .select('name')
      .eq('user_id', user.id);

    const existingTagNames = existingTags?.map(t => t.name) || [];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = language === 'it'
      ? `Sei un assistente utile che suggerisce tag rilevanti per le note. Suggerisci 3-5 tag brevi e rilevanti in base al contenuto. Considera i tag esistenti quando possibile: ${existingTagNames.join(', ')}. Restituisci solo un array JSON di stringhe di tag, nient'altro.`
      : `You are a helpful assistant that suggests relevant tags for notes. Suggest 3-5 short, relevant tags based on the content. Consider existing tags when possible: ${existingTagNames.join(', ')}. Return only a JSON array of tag strings, nothing else.`;

    const userPrompt = language === 'it'
      ? `Suggerisci tag per questa nota:\n\nTitolo: ${title}\n\nContenuto: ${body}`
      : `Suggest tags for this note:\n\nTitle: ${title}\n\nContent: ${body}`;

    console.log(`Making AI request for tag suggestions, language: ${language}`);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { 
            role: 'user', 
            content: userPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Include more specific error information
      const errorMessage = `AI gateway error (${aiResponse.status}): ${errorText}`;
      throw new Error(errorMessage);
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      throw new Error('Invalid response format from AI gateway');
    }
    
    let content = aiData.choices[0].message.content;
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    const suggestions = JSON.parse(content);

    console.log(`Generated tag suggestions for user ${user.id}`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-tags:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
