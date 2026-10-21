'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import type { LocalizedMessage } from '@/lib/i18n';
import { Select } from '@/components/ui/Select';
import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Users,
  Cpu,
  History,
  Ban,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface InvitationRow {
  id: string;
  code: string;
  email: string;
  role: string;
  status: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  planTier: string;
}

interface AuditLogRow {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadataJson: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [aiStatus, setAiStatus] = useState<{
    configuredMode: string;
    activeProvider: string;
    copilotModel: string;
    azureDeployment: string;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Create invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'STUDENT' | 'TUTOR' | 'ADMIN'>('STUDENT');
  const [inviteTtlHours, setInviteTtlHours] = useState(168);
  const [createdBanner, setCreatedBanner] = useState<LocalizedMessage | null>(null);

  const ADMIN_HEADERS = {
    'Content-Type': 'application/json',
  };

  const loadAdminData = async () => {
    const res = await fetch('/api/admin');
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setAuthError(data.error || 'Access denied');
      return;
    }
    setAuthError(null);
    setInvitations(data.invitations || []);
    setUsers(data.users || []);
    setAuditLogs(data.auditLogs || []);
    setAiStatus(data.aiStatus || null);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setCreatedBanner(null);

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        action: 'create_invitation',
        email: inviteEmail.trim(),
        role: inviteRole,
        maxUses: 1,
        ttlHours: inviteTtlHours,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setCreatedBanner({
        key: 'Created single-use invitation code {code} for {email} ({role}) — Share link: {url}',
        values: { code: data.code, email: inviteEmail, role: inviteRole, url: data.inviteUrl },
      });
      setInviteEmail('');
      loadAdminData();
    } else {
      setCreatedBanner({ key: 'Error: {error}', values: { error: data.error } });
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        action: 'revoke_invitation',
        invitationId,
      }),
    });
    loadAdminData();
  };

  const handleRotateInvitation = async (invitationId: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        action: 'rotate_invitation',
        invitationId,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setCreatedBanner({ key: 'Rotated invitation! New code: {code}', values: { code: data.code } });
      loadAdminData();
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        action: 'update_user_role',
        userId,
        role,
      }),
    });
    loadAdminData();
  };

  const handleToggleUserRevoke = async (user: UserRow) => {
    await fetch('/api/admin', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        action: user.status === 'REVOKED' ? 'restore_user' : 'revoke_user',
        userId: user.id,
        reason: 'Admin Governance Action',
      }),
    });
    loadAdminData();
  };

  const handleSwitchAiProvider = async (provider: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        action: 'switch_ai_provider',
        provider,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setAiStatus(data.aiStatus);
      loadAdminData();
    }
  };

  return (
    <div
      className="page-container"
      data-testid="admin-dashboard-page"
    >
      {/* Header */}
      <div className="rounded-2xl bg-atelier-obsidian p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow flex items-center gap-2 text-atelier-citron">
              <Shield className="h-3.5 w-3.5" />
              <span>{t("Administration / Behind the studio")}</span>
            </div>
            <h1 className="mt-5 text-3xl font-medium sm:text-4xl">{t("Keep the studio running.")}</h1>
            <p className="mt-4 text-sm text-slate-300">{t("Manage invitations, member access, and the AI tools behind the workspace.")}</p>
          </div>
        </div>

        {/* Pluggable AI Provider Switcher Bar */}
        {aiStatus && (
          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
            data-testid="ai-provider-switcher-panel"
          >
            <div className="flex items-center gap-3">
              <Cpu className="h-6 w-6 text-indigo-400" />
              <div>
                <div className="text-xs font-bold text-white">{t("Pluggable AI Engine Mode:")}{' '}
                  <span
                    className="rounded bg-indigo-500 px-2 py-0.5 font-mono text-[11px]"
                    data-testid="active-ai-provider-badge"
                  >
                    {aiStatus.configuredMode} ({aiStatus.activeProvider})
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Copilot SDK ({aiStatus.copilotModel}) ⇄ Azure OpenAI ({aiStatus.azureDeployment}) ⇄ Deterministic Symbolic CAS
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'auto', label: 'Auto (Copilot SDK + CAS)' },
                { id: 'copilot', label: 'GitHub Copilot SDK' },
                { id: 'azure-openai', label: 'Azure OpenAI' },
                { id: 'symbolic', label: 'Symbolic CAS Only' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSwitchAiProvider(m.id)}
                  data-testid={`switch-ai-${m.id}-btn`}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    aiStatus.configuredMode === m.id
                      ? 'bg-atelier-citron text-atelier-ink'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  {t(m.label)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {authError && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          {t(authError)}
        </div>
      )}

      {createdBanner && (
        <div
          className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900"
          data-testid="admin-created-invite-banner"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{t(createdBanner.key, createdBanner.values)}</span>
        </div>
      )}

      {/* Section 1: Create Single-Use / Expiring Invitation Code */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <PlusCircle className="h-4 w-4 text-atelier-vermilion" />{t("Issue Single-Use Invitation Code")}</h2>
          <form onSubmit={handleCreateInvitation} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">{t("Recipient Email Address")}</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="new.learner@university.edu"
                data-testid="admin-invite-email-input"
                className="lumina-input mt-2 w-full px-3 py-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-invite-role" className="block text-xs font-bold text-slate-700">{t("Assigned Role")}</label>
                <Select id="admin-invite-role"
                  value={inviteRole}
                  onValueChange={setInviteRole}
                  data-testid="admin-invite-role-select"
                  className="mt-2 w-full"
                  options={[{ value: 'STUDENT', label: t('STUDENT') }, { value: 'TUTOR', label: t('TUTOR') }, { value: 'ADMIN', label: t('ADMIN') }]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">{t("Expiration (Hours)")}</label>
                <input
                  type="number"
                  value={inviteTtlHours}
                  onChange={(e) => setInviteTtlHours(Number(e.target.value))}
                  className="lumina-input mt-2 w-full px-3 py-3 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="admin-create-invite-btn"
              className="primary-button w-full"
            >{t("Generate Single-Use Invite Code")}</button>
          </form>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-[11px] text-amber-900">
            <div className="flex items-center gap-1.5 font-extrabold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>{t("CLI-Only Bootstrap Security Policy")}</span>
            </div>
            <p className="mt-1 leading-relaxed">{t("No HTTP bootstrap admin endpoint exists. Initial root admins are provisioned solely via")}{' '}
              <code className="font-mono font-bold">npm run bootstrap:admin</code>.
            </p>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <KeyRound className="h-4 w-4 text-indigo-600" />{t('Invitation Codes ({count})', { count: invitations.length })}
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase text-slate-400">
                  <th className="pb-2">{t("Code")}</th>
                  <th className="pb-2">{t("Email")}</th>
                  <th className="pb-2">{t("Role")}</th>
                  <th className="pb-2">{t("Status")}</th>
                  <th className="pb-2 text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} data-testid={`invite-row-${inv.code}`}>
                    <td className="py-2.5 font-mono font-bold text-slate-900">
                      {inv.code}
                    </td>
                    <td className="py-2.5 text-slate-600">{inv.email}</td>
                    <td className="py-2.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {t(inv.role)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          inv.status === 'PENDING'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.status === 'ACCEPTED'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {t(inv.status)} ({inv.usedCount}/{inv.maxUses})
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {inv.status === 'PENDING' && (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRotateInvitation(inv.id)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                            title={t("Rotate Code")}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvitation(inv.id)}
                            data-testid={`revoke-invite-${inv.code}`}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
                          >{t("Revoke")}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2: User Role & Revocation Management + Audit Logs */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Users Table */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-6">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Users className="h-4 w-4 text-emerald-600" />{t('Registered Accounts & RBAC Roles ({count})', { count: users.length })}
          </h2>
          <div className="mt-4 space-y-2.5">
            {users.map((u) => (
              <div
                key={u.id}
                data-testid={`user-row-${u.email}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {u.name}{' '}
                    <span className="font-mono text-[11px] text-slate-500">
                      ({u.email})
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                    <span
                      className={`font-extrabold ${
                        u.status === 'REVOKED'
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >{t("Status: ")}{t(u.status)}
                    </span>
                    <span>·</span>
                    <span>{t("Plan: ")}{t(u.planTier)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={u.role}
                    onValueChange={role => void handleUpdateUserRole(u.id, role)}
                    aria-label={t('Role for {email}', { email: u.email })}
                    options={[{ value: 'STUDENT', label: t('STUDENT') }, { value: 'TUTOR', label: t('TUTOR') }, { value: 'ADMIN', label: t('ADMIN') }]}
                  />

                  {u.email !== 'admin@tavi.test' && (
                    <button
                      type="button"
                      onClick={() => handleToggleUserRevoke(u)}
                      data-testid={`toggle-revoke-user-${u.email}`}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                        u.status === 'REVOKED'
                          ? 'bg-emerald-600 text-white'
                          : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <Ban className="h-3 w-3" />
                      <span>{u.status === 'REVOKED' ? t('Restore') : t('Revoke')}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Immutable Security Audit Log Stream */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-6">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <History className="h-4 w-4 text-amber-600" />{t('Security & Governance Audit Trail ({count})', { count: auditLogs.length })}
          </h2>
          <div
            className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1"
            data-testid="audit-log-stream"
          >
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-extrabold text-slate-900">
                    {log.action}
                  </span>
                  <span className="text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-600">{t("Actor: ")}<strong>{log.actorEmail}</strong>{t(" · Target:")}{' '}
                  {log.targetType}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
