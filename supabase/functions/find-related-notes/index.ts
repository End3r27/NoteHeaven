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
    const { noteId, language = 'en' } = await req.json();
    
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
    
const currentTitle = currentNote.title?.trim() || 'Untitled';
const currentBody = currentNote.body?.trim() || '';

// If both are effectively empty, return no related notes (but don't crash)
if (!currentTitle && !currentBody) {
  console.warn(`Note ${noteId} has no usable content; returning empty related notes`);
  return new Response(
    JSON.stringify({ relatedNotes: [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }

    // Use AI to find related notes
    const notesContext = otherNotes.map(note => 
      `ID: ${note.id}\nTitle: ${note.title}\nContent: ${note.body}`
    ).join('\n\n---\n\n');

    const systemPrompt = language === 'it'
      ? 'Sei un assistente per le relazioni tra note. Data una nota corrente e un elenco di altre note, identifica le prime 5 note semanticamente più correlate in base alla somiglianza del contenuto, ai temi condivisi o agli argomenti complementari. Restituisci SOLO un array JSON di ID di note ordinati per rilevanza, nient\'altro. Esempio: ["id1", "id2", "id3"]'
      : 'You are a note relationship assistant. Given a current note and a list of other notes, identify the top 5 most semantically related notes based on content similarity, shared themes, or complementary topics. Return ONLY a JSON array of note IDs ordered by relevance, nothing else. Example: ["id1", "id2", "id3"]';

    const userPrompt = language === 'it'
      ? `Nota corrente:\nTitolo: ${currentNote.title}\nContenuto: ${currentNote.body}\n\nAltre note:\n${notesContext}`
      : `Current Note:\nTitle: ${currentNote.title}\nContent: ${currentNote.body}\n\nOther Notes:\n${notesContext}`;

    console.log(`Making AI request for related notes for note ${noteId}, language: ${language}`);

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
