const DOCS = [
  { type: 'privacy_policy', slug: 'privacy-policy', title: 'Privacy Policy', summary: 'Learn how we collect, use, disclose, and protect your personal data.', icon: 'shield-check' },
  { type: 'terms_of_service', slug: 'terms-of-service', title: 'Terms of Service', summary: 'The terms and conditions that govern your use of Gigvora.', icon: 'file-text' },
  { type: 'cookie_policy', slug: 'cookie-policy', title: 'Cookie Policy', summary: 'Understand how we use cookies and similar technologies.', icon: 'shield-check' },
  { type: 'acceptable_use_policy', slug: 'acceptable-use-policy', title: 'Acceptable Use Policy', summary: 'Rules and guidelines for acceptable use of our platform and services.', icon: 'shield-check' },
  { type: 'community_guidelines', slug: 'community-guidelines', title: 'Community Guidelines', summary: 'Standards for participating in the Gigvora community respectfully.', icon: 'users' },
  { type: 'data_processing_addendum', slug: 'data-processing-addendum', title: 'Data Processing Addendum', summary: 'Details on how we process personal data on behalf of customers.', icon: 'database' },
  { type: 'security_overview', slug: 'security-overview', title: 'Security Overview', summary: 'Overview of our security practices, safeguards, and infrastructure.', icon: 'lock' },
  { type: 'accessibility_statement', slug: 'accessibility-statement', title: 'Accessibility Statement', summary: 'Our commitment to accessibility and inclusive digital experiences.', icon: 'users' },
  { type: 'subprocessor_list', slug: 'subprocessor-list', title: 'Subprocessor List', summary: 'List of subprocessors who assist in delivering our services.', icon: 'users' },
  { type: 'data_retention_policy', slug: 'data-retention-policy', title: 'Data Retention Policy', summary: 'How long we retain your data and the criteria we use.', icon: 'clock' },
  { type: 'compliance_certifications', slug: 'compliance-certifications', title: 'Compliance Certifications', summary: 'Our current certifications and compliance attestations.', icon: 'award' },
  { type: 'legal_notices', slug: 'legal-notices', title: 'Legal Notices', summary: 'Important legal notices and disclaimers.', icon: 'file-text' },
];

export async function seed(knex) {
  await knex('legal_document_versions').del();
  await knex('legal_documents').del();

  for (const doc of DOCS) {
    const [row] = await knex('legal_documents')
      .insert({ document_type: doc.type, slug: doc.slug, title: doc.title, summary: doc.summary })
      .returning('id');

    const [version] = await knex('legal_document_versions')
      .insert({
        document_id: row.id,
        version: 1,
        body: `# ${doc.title}\n\nThis is the published Gigvora ${doc.title}. Full legal text is maintained by the Legal & Trust team and published through the canonical legal-versioning workflow.`,
        effective_at: knex.fn.now(),
        published_at: knex.fn.now(),
      })
      .returning('id');

    await knex('legal_documents').where({ id: row.id }).update({ current_version_id: version.id });
  }
}
