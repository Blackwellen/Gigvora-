// Seed prompts are global (owner_user_id null) and public. Two of them have
// a real `action_type` that "Run" actually executes via
// apps/api/src/modules/ai/prompts.service.js's ACTION_EXECUTORS — not
// placeholder copy. The rest are plain templates that get inserted into the
// Copilot composer for the user to send themselves.
export async function seed(knex) {
  const existing = await knex('ai_prompts').count('id as count').first();
  if (Number(existing.count) > 0) return; // idempotent — don't duplicate on re-seed

  await knex('ai_prompts').insert([
    {
      title: 'Summarize this conversation',
      description: 'Get a concise summary of the selected conversation, grounded in its real recent messages.',
      category: 'messaging',
      prompt_template: 'Summarize the key points and next steps from this conversation.',
      action_type: 'summarize_conversation',
      tags: JSON.stringify(['messaging', 'summary']),
      is_public: true,
    },
    {
      title: 'Draft smart replies',
      description: 'Generate three short suggested replies for the selected conversation.',
      category: 'messaging',
      prompt_template: 'Suggest three short replies I could send next.',
      action_type: 'generate_smart_replies',
      tags: JSON.stringify(['messaging', 'reply']),
      is_public: true,
    },
    {
      title: 'What changed in my account today?',
      description: 'A quick pulse-check on new posts, unread notifications and messages.',
      category: 'general',
      prompt_template: 'What is new in my account today? Keep it short.',
      tags: JSON.stringify(['general', 'summary']),
      is_public: true,
    },
    {
      title: 'Prep for an upcoming meeting',
      description: "Ask Copilot to pull together what's on your calendar and any related context.",
      category: 'meetings',
      prompt_template: 'What meetings do I have coming up, and is there anything I should prepare?',
      tags: JSON.stringify(['meetings']),
      is_public: true,
    },
  ]);
}
