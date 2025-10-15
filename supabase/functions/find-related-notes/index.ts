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
    const { noteId } = await req.json();
    
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

    // Get the current note
    const { data: currentNote, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();
    
    if (noteError || !currentNote) {
      throw new Error('Note not found');
    }

    // Get all other notes
    const { data: otherNotes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .neq('id', noteId);
    
    if (error) throw error;

    if (!otherNotes || otherNotes.length === 0) {
      return new Response(
        JSON.stringify({ relatedNotes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use AI to find related notes
    const notesContext = otherNotes.map(note => 
      `ID: ${note.id}\nTitle: ${note.title}\nContent: ${note.body}`
    ).join('\n\n---\n\n');

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
            content: 'You are a note relationship assistant. Given a current note and a list of other notes, identify the top 5 most semantically related notes based on content similarity, shared themes, or complementary topics. Return ONLY a JSON array of note IDs ordered by relevance, nothing else. Example: ["id1", "id2", "id3"]'
          },
          { 
            role: 'user', 
            content: `Current Note:\nTitle: ${currentNote.title}\nContent: ${currentNote.body}\n\nOther Notes:\n${notesContext}` 
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
      
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    const relevantIds = JSON.parse(content);
    const relatedNotes = otherNotes
      .filter(note => relevantIds.includes(note.id))
      .slice(0, 5); // Limit to top 5

    console.log(`Found ${relatedNotes.length} related notes for note ${noteId}`);

    return new Response(
      JSON.stringify({ relatedNotes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-related-notes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
