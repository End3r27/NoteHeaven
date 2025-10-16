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
    const { language = 'en' } = await req.json();
    
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

    // Get notes from the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', yesterday.toISOString())
      .order('updated_at', { ascending: false });
    
    if (error) throw error;

    if (!notes || notes.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: "No notes were created or updated in the last 24 hours. Start writing to see your daily recap!",
          notes: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notesText = notes.map(note => 
      `Title: ${note.title}\nContent: ${note.body}\nLast updated: ${new Date(note.updated_at).toLocaleString()}`
    ).join('\n\n---\n\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = language === 'it'
      ? 'Sei un assistente utile che crea riepiloghi giornalieri dell\'attività di annotazione. Riassumi su cosa ha lavorato l\'utente oggi, evidenzia i temi chiave, le intuizioni importanti e fornisci una panoramica organizzata della loro produttività. Sii incoraggiante e perspicace. Rispondi sempre in italiano.'
      : 'You are a helpful assistant that creates daily recaps of note-taking activity. Summarize what the user worked on today, highlight key themes, important insights, and provide an organized overview of their productivity. Be encouraging and insightful. Always respond in English.';

    const userPrompt = language === 'it'
      ? `Crea un riepilogo giornaliero per queste note delle ultime 24 ore:\n\n${notesText}`
      : `Create a daily recap for these notes from the last 24 hours:\n\n${notesText}`;

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
      
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    console.log(`Generated daily recap for user ${user.id}`);

    return new Response(
      JSON.stringify({ summary, notes, noteCount: notes.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-recap:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
