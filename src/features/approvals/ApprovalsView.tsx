import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { ApprovalRequest } from '../../types/index.ts';
import { formatDateTime } from '../../utils/format.ts';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  X,
  User,
  FileText,
} from 'lucide-react';

export const ApprovalsView: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review Modal
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewLoading, setReviewLoading] = useState(false);

  const canReview = isAdmin || hasPermission('manage_approvals');

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.getApprovals();
      setApprovals(data);
    } catch (err: any) {
      setError(err.message || 'Failed loading approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (req: ApprovalRequest, decision: 'APPROVE' | 'REJECT') => {
    setSelectedReq(req);
    setReviewAction(decision);
    setReviewComments('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setReviewLoading(true);
    setError(null);
    try {
      const res = await api.reviewApproval(selectedReq.id, reviewAction, reviewComments);
      setSuccessMsg(`Request #${selectedReq.id} marked as ${reviewAction}. Changes applied.`);
      setSelectedReq(null);
      loadApprovals();
    } catch (err: any) {
      setError(err.message || 'Failed updating approval decision');
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingList = approvals.filter((a) => a.status === 'PENDING');
  const historyList = approvals.filter((a) => a.status !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-[#2563EB]" />
            <span>Supervisor Approval Workflow</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Review restricted staff requests: excessive discounts, manual stock corrections, and bill returns.
          </p>
        </div>

        <button
          onClick={loadApprovals}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {/* PENDING QUEUE */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-3.5 flex items-center justify-between bg-amber-50/40">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">Pending Review Queue ({pendingList.length})</h2>
          </div>
          <span className="text-xs text-amber-800 font-medium">Requires management action</span>
        </div>

        <div className="divide-y divide-gray-200">
          {pendingList.map((req) => (
            <div key={req.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-gray-500">#{req.id}</span>
                  <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                    {req.actionType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-gray-400">• {formatDateTime(req.createdAt)}</span>
                </div>

                <div className="text-sm font-bold text-gray-900">
                  Target: {req.targetEntityRef}
                </div>

                <p className="text-xs text-gray-600 bg-slate-50 p-2.5 rounded-lg border border-gray-200">
                  <strong>Reason:</strong> {req.reason}
                </p>

                <div className="text-[11px] text-gray-500">
                  Requested by: <strong className="text-gray-800">{req.requestedByName}</strong>
                </div>
              </div>

              {/* Review Buttons */}
              {canReview && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenReview(req, 'APPROVE')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleOpenReview(req, 'REJECT')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg border border-red-300 bg-white px-4 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          ))}

          {pendingList.length === 0 && (
            <div className="py-12 text-center text-xs text-gray-500">
              No pending approval requests. All supervisor requests are resolved!
            </div>
          )}
        </div>
      </div>

      {/* RESOLVED HISTORY */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-3.5">
          <h2 className="text-sm font-bold text-gray-900">Resolved Requests History ({historyList.length})</h2>
          <p className="text-[11px] text-gray-500">Audit record of past approvals and rejections</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Reviewer & Comments</th>
                <th className="py-3 px-4">Resolved Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {historyList.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-gray-800">#{h.id}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{h.actionType}</td>
                  <td className="py-3 px-4 text-gray-700">{h.targetEntityRef}</td>
                  <td className="py-3 px-4 text-gray-600">{h.requestedByName}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        h.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <div>{h.reviewedByName}</div>
                    {h.reviewComments && <div className="text-[10px] text-gray-400 italic">"{h.reviewComments}"</div>}
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                    {formatDateTime(h.reviewedAt)}
                  </td>
                </tr>
              ))}

              {historyList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No resolved request history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW CONFIRMATION MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {reviewAction === 'APPROVE' ? 'Approve Request' : 'Reject Request'}: #{selectedReq.id}
              </h3>
              <button onClick={() => setSelectedReq(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 text-xs space-y-1.5 bg-slate-50 p-3 rounded-lg border border-gray-200">
              <p>
                <strong>Type:</strong> {selectedReq.actionType}
              </p>
              <p>
                <strong>Target:</strong> {selectedReq.targetEntityRef}
              </p>
              <p>
                <strong>Requester Reason:</strong> {selectedReq.reason}
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Supervisor Comments / Audit Note</label>
                <textarea
                  rows={2}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="e.g. Verified customer batch purchase agreement, approved."
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className={`rounded-lg px-4 py-1.5 font-bold text-white transition disabled:opacity-50 ${
                    reviewAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewLoading ? 'Processing...' : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
