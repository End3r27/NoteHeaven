import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const TOTAL_STORAGE_LIMIT = 2 * 1024 * 1024 * 1024; // 2 GB

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const noteId = formData.get('noteId') as string | null;

    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`);
    }

    // Check user's current storage from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('used_storage')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.used_storage + file.size > TOTAL_STORAGE_LIMIT) {
      throw new Error('Uploading this file would exceed your 2GB storage limit.');
    }

    // Upload file to Supabase Storage
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Construct the file URL manually. Note: this assumes the bucket is not public.
    // The URL will be signed by the time it reaches the frontend via the select query.
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/attachments/${uploadData.path}`;

    // Insert attachment record into the database
    const { data: attachment, error: insertError } = await supabase
      .from('attachments')
      .insert({
        user_id: user.id,
        note_id: noteId,
        filename: file.name,
        file_url: fileUrl, // Store the base URL
        filesize: file.size,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Return the complete attachment object to the frontend
    return new Response(JSON.stringify(attachment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in upload-attachment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
