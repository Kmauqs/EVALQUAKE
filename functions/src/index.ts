import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import type { Evaluation } from '../../src/domain/evaluation';
import { renderReportHtml } from '../../src/report/renderReportHtml';

if (!getApps().length) initializeApp();

const db = getFirestore();
const bucket = getStorage().bucket();

async function prepareCanonicalGeneration(reference: DocumentReference) {
  return db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(reference);
    const current = fresh.data() as Evaluation | undefined;
    if (!current || current.status === 'draft' || current.canonicalPdfStoragePath) return null;

    const leaseUntil = current.canonicalPdfLeaseUntil
      ? new Date(current.canonicalPdfLeaseUntil).getTime()
      : 0;
    if (current.canonicalPdfState === 'generating' && leaseUntil > Date.now()) return null;

    let officialNumber = current.officialNumber;
    if (officialNumber == null) {
      const counterRef = db.doc(`counters/${current.jurisdictionId}`);
      const counter = await transaction.get(counterRef);
      officialNumber = (counter.data()?.lastNumber ?? 0) + 1;
      transaction.set(
        counterRef,
        { lastNumber: officialNumber, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
    const lease = new Date(Date.now() + 3 * 60_000).toISOString();
    transaction.update(reference, {
      officialNumber,
      syncState: 'syncing',
      canonicalPdfState: 'generating',
      canonicalPdfLeaseUntil: lease,
      canonicalPdfError: FieldValue.delete(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });
    return { ...current, officialNumber, canonicalPdfState: 'generating' as const };
  });
}

async function generateCanonicalPdf(reference: DocumentReference) {
  const evaluation = await prepareCanonicalGeneration(reference);
  if (!evaluation) return;

  const photos = await Promise.all(
    evaluation.photos.map(async (photo) => {
      if (!photo.storagePath) return photo;
      const [localUri] = await bucket.file(photo.storagePath).getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60_000,
      });
      return { ...photo, localUri };
    }),
  );
  let sketchUri = evaluation.sketchUri;
  if (evaluation.sketchStoragePath) {
    [sketchUri] = await bucket.file(evaluation.sketchStoragePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60_000,
    });
  }
  const canonical: Evaluation = { ...evaluation, photos, sketchUri };
  const html = renderReportHtml(canonical, evaluation.reportLanguage ?? 'es');
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images)
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise<void>((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
              }),
          ),
      );
    });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    const path = `evaluations/${reference.id}/canonical/report-${evaluation.officialNumber}.pdf`;
    await bucket.file(path).save(Buffer.from(pdf), {
      contentType: 'application/pdf',
      resumable: false,
      metadata: {
        cacheControl: 'private, max-age=3600',
        metadata: {
          evaluationId: reference.id,
          jurisdictionId: evaluation.jurisdictionId,
        },
      },
    });
    await reference.update({
      canonicalPdfStoragePath: path,
      canonicalPdfState: 'ready',
      canonicalPdfLeaseUntil: FieldValue.delete(),
      status: 'synced',
      syncState: 'synced',
      syncedAt: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error('Canonical PDF generation failed', { evaluationId: reference.id, error });
    await reference.update({
      canonicalPdfState: 'error',
      canonicalPdfLeaseUntil: FieldValue.delete(),
      syncState: 'error',
      canonicalPdfError: String(error),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });
    throw error;
  } finally {
    await browser.close();
  }
}

export const finalizeEvaluation = onDocumentWritten(
  {
    document: 'evaluations/{evaluationId}',
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 120,
    retry: true,
  },
  async (event) => {
    const after = event.data?.after;
    const before = event.data?.before;
    if (!after?.exists) return;
    const evaluation = after.data() as Evaluation;
    const wasCritical = before?.exists
      ? ['unsafe', 'collapsed'].includes((before.data() as Evaluation).habitability)
      : false;

    if (['unsafe', 'collapsed'].includes(evaluation.habitability) && !wasCritical) {
      logger.warn('Critical habitability classification', {
        evaluationId: after.id,
        jurisdictionId: evaluation.jurisdictionId,
        habitability: evaluation.habitability,
      });
    }

    const beforeState = before?.exists
      ? (before.data() as Evaluation).canonicalPdfState
      : undefined;
    if (evaluation.canonicalPdfState === 'error' && beforeState === 'generating') return;
    await generateCanonicalPdf(after.ref);
  },
);

export const exportEvaluations = onCall(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    const role = request.auth?.token.role;
    if (!request.auth || !['coordinator', 'admin'].includes(String(role))) {
      throw new HttpsError('permission-denied', 'Coordinator or administrator role required.');
    }
    const { eventId, jurisdictionId } = request.data as {
      eventId?: string;
      jurisdictionId?: string;
    };
    if (!eventId || !jurisdictionId) {
      throw new HttpsError('invalid-argument', 'eventId and jurisdictionId are required.');
    }
    const allowed = (request.auth.token.jurisdictionIds as string[] | undefined) ?? [];
    if (role !== 'admin' && !allowed.includes(jurisdictionId)) {
      throw new HttpsError('permission-denied', 'Jurisdiction access denied.');
    }

    const snapshot = await db
      .collection('evaluations')
      .where('eventId', '==', eventId)
      .where('jurisdictionId', '==', jurisdictionId)
      .orderBy('updatedAt', 'desc')
      .limit(5000)
      .get();
    return {
      generatedAt: new Date().toISOString(),
      count: snapshot.size,
      evaluations: snapshot.docs.map((document) => document.data()),
    };
  },
);
