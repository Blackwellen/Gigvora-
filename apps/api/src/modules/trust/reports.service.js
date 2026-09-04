import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { generateReportNumber } from './refNumbers.js';

export async function listReasons() {
  return db('report_reasons').where({ active: true }).orderBy('sort_order');
}

/** §44-50 — reporter identity is NEVER surfaced through this module to the reported subject. */
export async function submitReport(reporterId, { objectType, objectId, reasonCode, subreasonCode, description, evidenceReference = [], urgency = 'normal' }) {
  if (!objectType || !objectId || !reasonCode) throw new AppError('objectType, objectId and reasonCode are required', 422);
  const reason = await db('report_reasons').where({ code: reasonCode }).first();
  if (!reason) throw new AppError('Unknown reason code', 422);

  // Dedup/link: if an open case already exists for this exact object, link this report to it
  // rather than spawning a duplicate investigation (§46/§166).
  const existingCase = await db('safety_cases')
    .where({ subject_type: objectType, subject_id: objectId })
    .whereNotIn('status', ['closed', 'resolved_no_action', 'resolved_actioned'])
    .first();

  const [report] = await db('reports')
    .insert({
      report_number: generateReportNumber(),
      reporter_id: reporterId,
      object_type: objectType,
      object_id: objectId,
      reason_code: reasonCode,
      subreason_code: subreasonCode || null,
      description: description || null,
      evidence_reference: JSON.stringify(evidenceReference),
      urgency,
      status: existingCase ? 'linked' : 'submitted',
      case_id: existingCase ? existingCase.id : null,
    })
    .returning('*');

  await emitEvent({ aggregateType: 'report', aggregateId: report.id, eventType: 'trust.report.created', payload: { objectType, objectId, urgency } });
  return report;
}

export async function listMyReports(reporterId) {
  return db('reports').where({ reporter_id: reporterId }).orderBy('created_at', 'desc');
}
