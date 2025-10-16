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
    const { query, language = 'en' } = await req.json();
    
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
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

    // Get all user's notes
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) throw error;

    if (!notes || notes.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }

    // Use AI to find semantically similar notes
    const notesContext = notes.map(note => 
      `ID: ${note.id}\nTitle: ${note.title}\nContent: ${note.body}`
    ).join('\n\n---\n\n');

    const systemPrompt = language === 'it'
      ? 'Sei un assistente di ricerca semantica. Data una query di ricerca e un elenco di note, restituisci gli ID delle note semanticamente correlate alla query, ordinati per rilevanza. Restituisci SOLO un array JSON di ID di note, nient\'altro. Esempio: ["id1", "id2", "id3"]'
      : 'You are a semantic search assistant. Given a search query and a list of notes, return the IDs of notes that are semantically related to the query, ordered by relevance. Return ONLY a JSON array of note IDs, nothing else. Example: ["id1", "id2", "id3"]';

    const userPrompt = language === 'it'
      ? `Query di ricerca: "${query}"\n\nNote:\n${notesContext}`
      : `Search query: "${query}"\n\nNotes:\n${notesContext}`;

    console.log(`Making AI request for semantic search: "${query}", language: ${language}, notes count: ${notes.length}`);
    
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`;

    const aiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      // Include more specific error information
      const errorMessage = `AI gateway error (${aiResponse.status}): ${errorText}`;
      throw new Error(errorMessage);
    }

    const aiData = await aiResponse.json();

    if (!aiData.candidates || !aiData.candidates[0] || !aiData.candidates[0].content || !aiData.candidates[0].content.parts || !aiData.candidates[0].content.parts[0]) {
      throw new Error('Invalid response format from AI gateway');
    }
    
    let content = aiData.candidates[0].content.parts[0].text;
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    const relevantIds = JSON.parse(content);
    const results = notes.filter(note => relevantIds.includes(note.id));

    console.log(`Semantic search for "${query}" returned ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in semantic-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
