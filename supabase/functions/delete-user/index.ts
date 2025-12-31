import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's auth to verify they're an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the requester is authenticated
    const { data: { user: requester }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requester) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify requester is admin using service role client
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requester.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === requester.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting deletion process for user: ${userId}`);

    // Clear foreign key references before deleting the user
    // Set tags.created_by to null for tags created by this user
    const { error: tagsError } = await supabaseAdmin
      .from('tags')
      .update({ created_by: null })
      .eq('created_by', userId);
    
    if (tagsError) {
      console.error('Error clearing tags created_by:', tagsError);
    }

    // Delete user_tags
    const { error: userTagsError } = await supabaseAdmin
      .from('user_tags')
      .delete()
      .eq('user_id', userId);
    
    if (userTagsError) {
      console.error('Error deleting user_tags:', userTagsError);
    }

    // Delete user_roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (rolesError) {
      console.error('Error deleting user_roles:', rolesError);
    }

    // Delete follows (both as follower and following)
    await supabaseAdmin.from('follows').delete().eq('follower_id', userId);
    await supabaseAdmin.from('follows').delete().eq('following_id', userId);

    // Delete notifications
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId);

    // Delete notification_preferences
    await supabaseAdmin.from('notification_preferences').delete().eq('user_id', userId);

    // Delete task_comments
    await supabaseAdmin.from('task_comments').delete().eq('user_id', userId);

    // Delete task_votes
    await supabaseAdmin.from('task_votes').delete().eq('user_id', userId);

    // Delete task_likes
    await supabaseAdmin.from('task_likes').delete().eq('user_id', userId);

    // Delete task_feedback
    await supabaseAdmin.from('task_feedback').delete().eq('user_id', userId);

    // Delete task_ratings (both as rater and rated)
    await supabaseAdmin.from('task_ratings').delete().eq('rater_user_id', userId);
    await supabaseAdmin.from('task_ratings').delete().eq('rated_user_id', userId);

    // Delete task_collaborators
    await supabaseAdmin.from('task_collaborators').delete().eq('user_id', userId);

    // Delete testimonials (both as author and profile user)
    await supabaseAdmin.from('testimonials').delete().eq('author_user_id', userId);
    await supabaseAdmin.from('testimonials').delete().eq('profile_user_id', userId);

    // Get user's tasks to delete task_tags first
    const { data: userTasks } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('created_by', userId);

    if (userTasks && userTasks.length > 0) {
      const taskIds = userTasks.map(t => t.id);
      
      // Delete task_tags for user's tasks
      await supabaseAdmin.from('task_tags').delete().in('task_id', taskIds);
      
      // Delete task_collaborators for user's tasks
      await supabaseAdmin.from('task_collaborators').delete().in('task_id', taskIds);
      
      // Delete task_comments for user's tasks
      await supabaseAdmin.from('task_comments').delete().in('task_id', taskIds);
      
      // Delete task_votes for user's tasks
      await supabaseAdmin.from('task_votes').delete().in('task_id', taskIds);
      
      // Delete task_likes for user's tasks
      await supabaseAdmin.from('task_likes').delete().in('task_id', taskIds);
      
      // Delete task_feedback for user's tasks
      await supabaseAdmin.from('task_feedback').delete().in('task_id', taskIds);
      
      // Delete task_ratings for user's tasks
      await supabaseAdmin.from('task_ratings').delete().in('task_id', taskIds);
    }

    // Delete tasks
    await supabaseAdmin.from('tasks').delete().eq('created_by', userId);

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    console.log(`Finished cleaning up related data for user: ${userId}`);

    // Delete user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
