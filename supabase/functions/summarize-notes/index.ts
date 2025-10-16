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
    const { type, folderId, tagName, language = 'en' } = await req.json();
    
    if (!type || !['recent', 'folder', 'tag'].includes(type)) {
      throw new Error('Valid type is required (recent, folder, or tag)');
    }
    
    if (type === 'folder' && !folderId) {
      throw new Error('folderId is required for folder type');
    }
    
    if (type === 'tag' && !tagName) {
      throw new Error('tagName is required for tag type');
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

    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    let notes = [];
    let summaryContext = '';

    // Fetch notes based on type
    if (type === 'recent') {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      notes = data || [];
      summaryContext = 'recent activity and notes';
    } else if (type === 'folder') {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('folder_id', folderId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      notes = data || [];
      
      // Get folder name
      const { data: folderData } = await supabase
        .from('folders')
        .select('name')
        .eq('id', folderId)
        .single();
      
      summaryContext = `notes in the "${folderData?.name || 'selected'}" folder`;
    } else if (type === 'tag') {
      // Get notes with specific tag
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .eq('user_id', user.id)
        .single();
      
      if (tagError || !tagData) {
        notes = [];
      } else {
        const { data: noteTagsData, error: noteTagsError } = await supabase
          .from('note_tags')
          .select('note_id')
          .eq('tag_id', tagData.id);
        
        if (!noteTagsError && noteTagsData) {
          const noteIds = noteTagsData.map(nt => nt.note_id);
          
          if (noteIds.length > 0) {
            const { data, error } = await supabase
              .from('notes')
              .select('*')
              .in('id', noteIds)
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false });
            
            if (!error) {
              notes = data || [];
            }
          }
        }
      }
      
      summaryContext = `notes tagged with "${tagName}"`;
    }

    if (notes.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: `No notes found for ${summaryContext}. Create some notes to get started!` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notes data for AI
    const notesText = notes.map(note => 
      `Title: ${note.title}\nContent: ${note.body}\nLast updated: ${new Date(note.updated_at).toLocaleDateString()}`
    ).join('\n\n---\n\n');

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    const languageInstruction = language === 'it' 
      ? 'Rispondi sempre in italiano.' 
      : 'Always respond in English.';
    
    if (type === 'recent') {
      systemPrompt = language === 'it'
        ? 'Sei un assistente utile che crea riepiloghi concisi delle attività recenti di annotazione. Riassumi i temi principali, gli argomenti trattati ed evidenzia eventuali intuizioni o modelli importanti. Mantienilo organizzato e facile da scansionare. Rispondi sempre in italiano.'
        : 'You are a helpful assistant that creates concise recaps of recent note-taking activity. Summarize the main themes, topics covered, and highlight any important insights or patterns. Keep it organized and easy to scan. Always respond in English.';
    } else if (type === 'folder' || type === 'tag') {
      systemPrompt = language === 'it'
        ? 'Sei un assistente utile che crea riepiloghi organizzati di note correlate. Identifica temi comuni, intuizioni chiave e fornisci una panoramica coerente. Struttura il tuo riepilogo con sezioni chiare se appropriato. Rispondi sempre in italiano.'
        : 'You are a helpful assistant that creates organized summaries of related notes. Identify common themes, key insights, and provide a cohesive overview. Structure your summary with clear sections if appropriate. Always respond in English.';
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Please summarize these ${summaryContext}:\n\n${notesText}` 
          }
        ],
      }),
    });

    console.log(`Making AI request for ${type} summary, language: ${language}, notes count: ${notes.length}`);

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
    
    const summary = aiData.choices[0].message.content;
    
    if (!summary || summary.trim().length === 0) {
      throw new Error('Empty summary generated by AI');
    }

    console.log(`Generated ${type} summary for user ${user.id}`);

    return new Response(
      JSON.stringify({ summary, noteCount: notes.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-notes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
