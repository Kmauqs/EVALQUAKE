import type { UserRole, Evaluation } from '@/domain/evaluation';
import { canModerateDelete } from '@/domain/evaluation';
import { moderateDeleteEvaluation } from '@/firebase/moderation';
import { confirmDestructive } from '@/services/confirm';
import { notify } from '@/services/notify';
import { deleteLocalEvaluation } from '@/services/localStore';

export function requestModerateDelete(
  evaluation: Evaluation,
  role: UserRole | null,
  copy: {
    purgeEvaluationTitle: string;
    purgeDraftWarning: string;
    purgeSubmittedWarning: string;
    deleteEvaluation: string;
    cancel: string;
    deleteFailed: string;
    outsideWorkGroupScope: string;
  },
  onDeleted: () => void,
) {
  if (!canModerateDelete(evaluation, role)) return;
  const submitted = evaluation.status !== 'draft' || evaluation.officialNumber != null;
  confirmDestructive(
    copy.purgeEvaluationTitle,
    submitted ? copy.purgeSubmittedWarning : copy.purgeDraftWarning,
    copy.deleteEvaluation,
    copy.cancel,
    () => {
      void moderateDeleteEvaluation(evaluation.id)
        .then(async () => {
          await deleteLocalEvaluation(evaluation.id, false).catch(() => undefined);
          onDeleted();
        })
        .catch((error: unknown) => {
          const code =
            typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
          notify(
            copy.purgeEvaluationTitle,
            code.includes('permission-denied') ? copy.outsideWorkGroupScope : copy.deleteFailed,
          );
        });
    },
  );
}
