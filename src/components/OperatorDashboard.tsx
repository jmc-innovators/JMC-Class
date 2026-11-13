import React, { useState, useEffect, useCallback } from 'react';
import {
  School,
  UserProfile,
  AuditLog,
  SchoolApplication,
  ApplicationStatus,
  GoogleWorkspaceConfig,
  WorkspaceVerificationResult,
} from '../types';
import {
  Shield,
  School as SchoolIcon,
  Plus,
  Trash2,
  ExternalLink,
  ClipboardList,
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileCheck,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Globe,
  Loader2,
  FileText,
  UserCheck,
  X,
  FolderOpen,
  FileSpreadsheet,
  Send,
  DatabaseBackup,
  FileBarChart2,
  Table as TableIcon,
  LayoutGrid,
  Check,
  KeyRound,
  Paperclip,
  LogOut,
  Copy,
  Download,
  Link2,
  Unlink,
  Terminal,
} from 'lucide-react';
import {
  fetchSchoolApplications,
  approveSchoolApplication,
  rejectSchoolApplication,
} from '../lib/firestoreService';
import {
  connectGoogleWorkspace,
  getWorkspaceAccessToken,
  clearWorkspaceAccessToken,
  PRIMARY_OPERATOR_EMAIL,
  auth,
} from '../lib/firebase';
import {
  fetchWorkspaceConfig,
  verifyWorkspaceAccountAndAliases,
  provisionWorkspaceAutomation,
  syncAllApplicationsToSheets,
  executeApprovalInWorkspace,
  executeRejectionInWorkspace,
  generateSystemReportToDrive,
  backupDatabaseToDrive,
  fetchAppsScriptTemplate,
  verifyAndSaveAppsScriptUrl,
  disconnectAppsScriptUrl,
  runAppsScriptAutomationAction,
  WORKSPACE_ROOT_FOLDER_NAME,
  WORKSPACE_SPREADSHEET_NAME,
  SUBFOLDER_NAMES,
  SHEET_TABS,
} from '../lib/googleWorkspaceService';

interface OperatorDashboardProps {
  user: UserProfile;
  schools: School[];
  currentSchool: School | null;
  onSelectSchool: (school: School) => void;
  onCreateSchool: (data: {
    name: string;
    adminEmail: string;
    principalName: string;
    schoolType: string;
    district: string;
    province: string;
    phone: string;
    email: string;
    website: string;
    academicYear: string;
  }) => Promise<void>;
  onDeleteSchool: (schoolId: string) => Promise<void>;
  onRefreshSchools?: () => Promise<void>;
  auditLogs: AuditLog[];
  loading: boolean;
}

type ConfirmActionType = 'provision' | 'sync' | 'report' | 'backup' | 'approve' | 'reject';

interface PendingConfirmation {
  type: ConfirmActionType;
  title: string;
  description: string;
  items: string[];
  app?: SchoolApplication;
  remarks?: string;
}

const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  user,
  schools,
  currentSchool,
  onSelectSchool,
  onCreateSchool,
  onDeleteSchool,
  onRefreshSchools,
  auditLogs,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<'applications' | 'workspace' | 'schools' | 'audit'>('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    principalName: '',
    schoolType: 'National School',
    district: 'Jaffna',
    province: 'Northern Province',
    phone: '',
    email: '',
    website: '',
    academicYear: '2026',
  });
  const [submitting, setSubmitting] = useState(false);

  // Applications State
  const [applications, setApplications] = useState<SchoolApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appStatusTab, setAppStatusTab] = useState<ApplicationStatus | 'ALL'>('PENDING');
  const [appViewMode, setAppViewMode] = useState<'table' | 'cards'>('table');
  const [appSearch, setAppSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<SchoolApplication | null>(null);
  const [operatorRemarks, setOperatorRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [confirmDeleteSchoolId, setConfirmDeleteSchoolId] = useState<string | null>(null);

  // Google Workspace Automation State (Token cached in memory only)
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(() => getWorkspaceAccessToken());
  const [workspaceConfig, setWorkspaceConfig] = useState<GoogleWorkspaceConfig | null>(null);
  const [verification, setVerification] = useState<WorkspaceVerificationResult | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);

  // Zero-Env Google Apps Script Automation State
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState('');
  const [appsScriptBusy, setAppsScriptBusy] = useState(false);
  const [codeGsLoading, setCodeGsLoading] = useState(false);
  const [codeGsCopied, setCodeGsCopied] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    setAppsError(null);
    try {
      const data = await fetchSchoolApplications(user.email);
      setApplications(data);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      let msg = err?.message || 'Failed to load school registration applications.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {}
      setAppsError(msg);
    } finally {
      setLoadingApps(false);
    }
  }, [user.email]);

  const loadWorkspaceSettings = useCallback(async () => {
    try {
      const cfg = await fetchWorkspaceConfig(user.email);
      setWorkspaceConfig(cfg);
      if (cfg?.appsScriptUrl) {
        setAppsScriptUrlInput((prev) => prev || cfg.appsScriptUrl || '');
      }
    } catch (err) {
      console.warn('Could not load Workspace config:', err);
    }
  }, [user.email]);

  useEffect(() => {
    loadApplications();
    loadWorkspaceSettings();
  }, [loadApplications, loadWorkspaceSettings]);

  const handleConnectWorkspace = async () => {
    setWorkspaceLoading(true);
    setWorkspaceNotice(null);
    try {
      const { accessToken } = await connectGoogleWorkspace();
      setWorkspaceToken(accessToken);
      const verifyResult = await verifyWorkspaceAccountAndAliases(accessToken);
      setVerification(verifyResult);
      setWorkspaceNotice({
        type: 'success',
        text: verifyResult.message,
      });
    } catch (err: any) {
      console.error('Workspace OAuth error:', err);
      setWorkspaceNotice({
        type: 'error',
        text: err?.message || 'Could not authorize Google Workspace access.',
      });
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleDisconnectWorkspace = () => {
    clearWorkspaceAccessToken();
    setWorkspaceToken(null);
    setVerification(null);
    setWorkspaceNotice({
      type: 'info',
      text: 'Google Workspace OAuth session token cleared from memory.',
    });
  };

  const handleCopyCodeGs = async () => {
    setCodeGsLoading(true);
    try {
      const tpl = await fetchAppsScriptTemplate(user.email);
      await navigator.clipboard.writeText(tpl.code);
      setCodeGsCopied(true);
      setWorkspaceNotice({
        type: 'success',
        text: `Copied Code.gs (${tpl.code.length.toLocaleString()} characters) pre-configured for ${PRIMARY_OPERATOR_EMAIL}. Paste it into script.google.com.`,
      });
      setTimeout(() => setCodeGsCopied(false), 3000);
    } catch (err: any) {
      setWorkspaceNotice({
        type: 'error',
        text: err?.message || 'Failed to copy Code.gs to clipboard.',
      });
    } finally {
      setCodeGsLoading(false);
    }
  };

  const handleDownloadCodeGs = async () => {
    setCodeGsLoading(true);
    try {
      const tpl = await fetchAppsScriptTemplate(user.email);
      const blob = new Blob([tpl.code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Code.gs';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setWorkspaceNotice({
        type: 'success',
        text: `Downloaded Code.gs pre-configured for ${PRIMARY_OPERATOR_EMAIL}.`,
      });
    } catch (err: any) {
      setWorkspaceNotice({
        type: 'error',
        text: err?.message || 'Failed to download Code.gs.',
      });
    } finally {
      setCodeGsLoading(false);
    }
  };

  const handleVerifyAppsScriptUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = appsScriptUrlInput.trim();
    if (!targetUrl) {
      setWorkspaceNotice({
        type: 'error',
        text: 'Paste your deployed Google Apps Script Web App URL first (https://script.google.com/macros/s/.../exec).',
      });
      return;
    }

    setAppsScriptBusy(true);
    setWorkspaceNotice(null);
    try {
      const { config, account } = await verifyAndSaveAppsScriptUrl(targetUrl, user.email);
      setWorkspaceConfig(config);
      setAppsScriptUrlInput(config.appsScriptUrl || targetUrl);
      setWorkspaceNotice({
        type: 'success',
        text: `Apps Script Web App verified & saved directly in database (no .env needed)! Executing account: ${
          account.effectiveEmail || PRIMARY_OPERATOR_EMAIL
        } (${account.mode || 'direct_account'}). Drive folders & 4-tab Sheets database are ready.`,
      });
    } catch (err: any) {
      setWorkspaceNotice({
        type: 'error',
        text: err?.message || 'Could not verify Google Apps Script Web App URL.',
      });
    } finally {
      setAppsScriptBusy(false);
    }
  };

  const handleDisconnectAppsScript = async () => {
    setAppsScriptBusy(true);
    setWorkspaceNotice(null);
    try {
      const updated = await disconnectAppsScriptUrl(user.email);
      setWorkspaceConfig(updated);
      setAppsScriptUrlInput('');
      setWorkspaceNotice({
        type: 'info',
        text: 'Google Apps Script Web App URL unlinked from platform configuration.',
      });
    } catch (err: any) {
      setWorkspaceNotice({
        type: 'error',
        text: err?.message || 'Failed to unlink Apps Script URL.',
      });
    } finally {
      setAppsScriptBusy(false);
    }
  };

  const handleRunAppsScriptAction = async (
    action: 'setupWorkspace' | 'syncApplications' | 'generateReport' | 'backupDatabase'
  ) => {
    setAppsScriptBusy(true);
    setWorkspaceNotice(null);
    try {
      const { result, config } = await runAppsScriptAutomationAction(
        action,
        user.email,
        action === 'syncApplications' ? { applications, schools } : undefined
      );
      setWorkspaceConfig(config);

      if (action === 'syncApplications') {
        setWorkspaceNotice({
          type: 'success',
          text: `Apps Script synced ${result?.syncedApplications ?? applications.length} applications and ${
            result?.syncedSchools ?? schools.length
          } schools to Google Sheets under ${PRIMARY_OPERATOR_EMAIL}.`,
        });
      } else if (action === 'generateReport') {
        setWorkspaceNotice({
          type: 'success',
          text: `Apps Script generated system report "${result?.fileName || 'JMC System Report'}" in Google Drive.`,
        });
      } else if (action === 'backupDatabase') {
        setWorkspaceNotice({
          type: 'success',
          text: `Apps Script saved JSON database backup "${result?.fileName || 'JMC Backup'}" in Google Drive.`,
        });
      } else {
        setWorkspaceNotice({
          type: 'success',
          text: `Apps Script verified "${WORKSPACE_ROOT_FOLDER_NAME}" & 4-tab Sheets database for ${PRIMARY_OPERATOR_EMAIL}.`,
        });
      }
    } catch (err: any) {
      setWorkspaceNotice({
        type: 'error',
        text: err?.message || 'Apps Script automation action failed.',
      });
    } finally {
      setAppsScriptBusy(false);
    }
  };

  const handleDownloadDocument = async (app: SchoolApplication) => {
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
      const res = await fetch(`/api/school-applications/${app.id}/document`, {
        headers: {
          'x-actor-role': 'operator',
          'x-actor-email': user.email || PRIMARY_OPERATOR_EMAIL,
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Document not available.');
      }
      const payload = await res.json();
      const byteCharacters = atob(payload.base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: payload.mimeType || 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.fileName || app.documentName || `${app.id}_document`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to download supporting document.',
      });
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.adminEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.district || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.adminEmail) return;
    setSubmitting(true);
    try {
      await onCreateSchool(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        adminEmail: '',
        principalName: '',
        schoolType: 'National School',
        district: 'Jaffna',
        province: 'Northern Province',
        phone: '',
        email: '',
        website: '',
        academicYear: '2026',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Application Stats
  const totalAppsCount = applications.length;
  const pendingAppsCount = applications.filter((a) => a.status === 'PENDING').length;
  const approvedAppsCount = applications.filter((a) => a.status === 'APPROVED').length;
  const rejectedAppsCount = applications.filter((a) => a.status === 'REJECTED').length;

  // Filtered Applications by sub-tab and search
  const displayedApplications = applications.filter((app) => {
    const matchesTab = appStatusTab === 'ALL' || app.status === appStatusTab;
    const matchesSearch =
      !appSearch ||
      app.schoolName.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.administratorEmail.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.administratorName.toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.principalName || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      app.district.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.id.toLowerCase().includes(appSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleOpenAppDetail = (app: SchoolApplication) => {
    setSelectedApp(app);
    setOperatorRemarks(app.operatorRemarks || '');
    setActionMessage(null);
  };

  // Request explicit confirmation before mutating Google Workspace or sending Gmail emails
  const requestProvisionConfirmation = () => {
    if (!workspaceToken) {
      setWorkspaceNotice({
        type: 'error',
        text: 'Please sign in with Google Workspace first using the Sign in with Google button.',
      });
      return;
    }
    setPendingConfirm({
      type: 'provision',
      title: 'Initialize Google Drive & Google Sheets Automation?',
      description: `This will verify or create the dedicated Google Drive structure and Google Sheets database under your authorized Google session (${verification?.connectedEmail || PRIMARY_OPERATOR_EMAIL}).`,
      items: [
        `Create or reuse root folder "${WORKSPACE_ROOT_FOLDER_NAME}" (avoiding duplicates)`,
        `Ensure 5 subfolders: ${Object.values(SUBFOLDER_NAMES).join(', ')}`,
        `Create or reuse Spreadsheet "${WORKSPACE_SPREADSHEET_NAME}" with 4 tabs (${Object.values(SHEET_TABS).join(', ')})`,
        'Append an initialization entry to the Activity Logs sheet',
      ],
    });
  };

  const requestSyncConfirmation = () => {
    if (!workspaceToken || !workspaceConfig?.spreadsheetId) {
      setWorkspaceNotice({
        type: 'error',
        text: 'Initialize Google Drive & Sheets first before syncing records.',
      });
      return;
    }
    setPendingConfirm({
      type: 'sync',
      title: 'Sync Registration Records to Sheets & Drive?',
      description: `This will write ${applications.length} application rows to Google Sheets and upload any pending registration attachments to Google Drive.`,
      items: [
        `Update "${SHEET_TABS.REGISTRATIONS}", "${SHEET_TABS.APPROVED}", and "${SHEET_TABS.REJECTED}" tabs`,
        `Upload pending supporting documents to Drive folder "${SUBFOLDER_NAMES.schoolRegistrations}"`,
        `Append sync record to "${SHEET_TABS.LOGS}"`,
      ],
    });
  };

  const requestReportConfirmation = () => {
    if (!workspaceToken || !workspaceConfig?.subfolders?.systemReports) {
      setWorkspaceNotice({
        type: 'error',
        text: 'Initialize Google Drive & Sheets first before generating reports.',
      });
      return;
    }
    setPendingConfirm({
      type: 'report',
      title: 'Generate & Upload System Report to Google Drive?',
      description: 'Creates a timestamped platform summary report file and logs the export.',
      items: [
        `Upload JMC_System_Report text summary to Drive folder "${SUBFOLDER_NAMES.systemReports}"`,
        `Record export in "${SHEET_TABS.LOGS}"`,
      ],
    });
  };

  const requestBackupConfirmation = () => {
    if (!workspaceToken || !workspaceConfig?.subfolders?.backups) {
      setWorkspaceNotice({
        type: 'error',
        text: 'Initialize Google Drive & Sheets first before running a backup.',
      });
      return;
    }
    setPendingConfirm({
      type: 'backup',
      title: 'Create JSON Database Backup in Google Drive?',
      description: `Exports ${schools.length} active schools and ${applications.length} registration records to Google Drive.`,
      items: [
        `Upload timestamped JSON backup to Drive folder "${SUBFOLDER_NAMES.backups}"`,
        `Record backup action in "${SHEET_TABS.LOGS}"`,
      ],
    });
  };

  const requestApproveConfirmation = () => {
    if (!selectedApp) return;
    const remarks = operatorRemarks.trim() || 'Verified and approved by JMC Platform Operator';
    const oauthReady = Boolean(workspaceToken && workspaceConfig?.spreadsheetId);
    const appsScriptReady = Boolean(workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl);
    const automationReady = oauthReady || appsScriptReady;

    setPendingConfirm({
      type: 'approve',
      app: selectedApp,
      remarks,
      title: `Confirm Approval: ${selectedApp.schoolName}`,
      description: automationReady
        ? 'Approving executes the following permanent actions across Firestore and Google Workspace:'
        : 'Neither OAuth nor Apps Script Web App is connected yet. You can approve in Firestore now, or connect Apps Script in Google Workspace Automation first.',
      items: oauthReady
        ? [
            `Generate School ID and activate school in Cloud Firestore for admin ${selectedApp.administratorEmail}`,
            `Update Google Sheets "${SHEET_TABS.REGISTRATIONS}", "${SHEET_TABS.APPROVED}", and "${SHEET_TABS.LOGS}"`,
            `Archive approval JSON record to Drive folder "${SUBFOLDER_NAMES.approvedSchools}"`,
            `Send approval confirmation email via Gmail to ${selectedApp.administratorEmail} (Sender mode: ${workspaceConfig?.aliasMode || 'verified'})`,
          ]
        : appsScriptReady
        ? [
            `Generate School ID and activate school in Cloud Firestore for admin ${selectedApp.administratorEmail}`,
            `Update Google Sheets (${SHEET_TABS.REGISTRATIONS}, ${SHEET_TABS.APPROVED}, ${SHEET_TABS.LOGS}) via Apps Script`,
            `Archive approval record to Drive & send Gmail approval email from ${PRIMARY_OPERATOR_EMAIL}`,
          ]
        : [
            `Generate School ID and activate school in Cloud Firestore for admin ${selectedApp.administratorEmail}`,
            'Mark application as APPROVED in backend database',
          ],
    });
  };

  const requestRejectConfirmation = () => {
    if (!selectedApp) return;
    const remarks = operatorRemarks.trim() || 'Application did not meet verification criteria.';
    const oauthReady = Boolean(workspaceToken && workspaceConfig?.spreadsheetId);
    const appsScriptReady = Boolean(workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl);
    const automationReady = oauthReady || appsScriptReady;

    setPendingConfirm({
      type: 'reject',
      app: selectedApp,
      remarks,
      title: `Confirm Rejection: ${selectedApp.schoolName}`,
      description: automationReady
        ? 'Rejecting updates Firestore, Google Sheets, Google Drive, and sends a Gmail notice:'
        : 'Google Workspace / Apps Script is not connected yet. Rejecting updates Firestore & backend records now.',
      items: oauthReady
        ? [
            `Mark application ${selectedApp.id} as REJECTED with notes: "${remarks}"`,
            `Update Google Sheets "${SHEET_TABS.REGISTRATIONS}", "${SHEET_TABS.REJECTED}", and "${SHEET_TABS.LOGS}"`,
            `Archive rejection JSON record to Drive folder "${SUBFOLDER_NAMES.rejectedApplications}"`,
            `Send rejection explanation email via Gmail to ${selectedApp.administratorEmail}`,
          ]
        : appsScriptReady
        ? [
            `Mark application ${selectedApp.id} as REJECTED with notes: "${remarks}"`,
            `Update Google Sheets (${SHEET_TABS.REGISTRATIONS}, ${SHEET_TABS.REJECTED}, ${SHEET_TABS.LOGS}) via Apps Script`,
            `Archive rejection record to Drive & send rejection notice from ${PRIMARY_OPERATOR_EMAIL}`,
          ]
        : [
            `Mark application ${selectedApp.id} as REJECTED in Cloud Firestore & backend database`,
          ],
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);

    if (action.type === 'provision' && workspaceToken) {
      setWorkspaceLoading(true);
      setWorkspaceNotice(null);
      try {
        const { config, verification: verifyResult } = await provisionWorkspaceAutomation(
          workspaceToken,
          workspaceConfig || undefined,
          user.email
        );
        setWorkspaceConfig(config);
        setVerification(verifyResult);
        setWorkspaceNotice({
          type: 'success',
          text: `Provisioned "${WORKSPACE_ROOT_FOLDER_NAME}" (5 subfolders) and Spreadsheet "${WORKSPACE_SPREADSHEET_NAME}" (4 sheets).`,
        });
      } catch (err: any) {
        setWorkspaceNotice({
          type: 'error',
          text: err?.message || 'Workspace provisioning failed.',
        });
      } finally {
        setWorkspaceLoading(false);
      }
      return;
    }

    if (action.type === 'sync' && workspaceToken && workspaceConfig) {
      setWorkspaceLoading(true);
      setWorkspaceNotice(null);
      try {
        const res = await syncAllApplicationsToSheets(
          workspaceToken,
          workspaceConfig,
          applications,
          verification?.connectedEmail || user.email
        );
        await loadApplications();
        await loadWorkspaceSettings();
        setWorkspaceNotice({
          type: 'success',
          text: `Synced ${res.syncedCount} applications to Google Sheets and uploaded ${res.uploadedDocsCount} supporting attachments to Drive.`,
        });
      } catch (err: any) {
        setWorkspaceNotice({
          type: 'error',
          text: err?.message || 'Workspace sync failed.',
        });
      } finally {
        setWorkspaceLoading(false);
      }
      return;
    }

    if (action.type === 'report' && workspaceToken && workspaceConfig) {
      setWorkspaceLoading(true);
      setWorkspaceNotice(null);
      try {
        const res = await generateSystemReportToDrive(
          workspaceToken,
          workspaceConfig,
          schools,
          applications,
          verification?.connectedEmail || user.email
        );
        await loadWorkspaceSettings();
        setWorkspaceNotice({
          type: 'success',
          text: `Generated System Report "${res.fileName}" in Google Drive.`,
        });
      } catch (err: any) {
        setWorkspaceNotice({
          type: 'error',
          text: err?.message || 'Failed to generate system report.',
        });
      } finally {
        setWorkspaceLoading(false);
      }
      return;
    }

    if (action.type === 'backup' && workspaceToken && workspaceConfig) {
      setWorkspaceLoading(true);
      setWorkspaceNotice(null);
      try {
        const res = await backupDatabaseToDrive(
          workspaceToken,
          workspaceConfig,
          schools,
          applications,
          verification?.connectedEmail || user.email
        );
        await loadWorkspaceSettings();
        setWorkspaceNotice({
          type: 'success',
          text: `Created Drive backup "${res.fileName}".`,
        });
      } catch (err: any) {
        setWorkspaceNotice({
          type: 'error',
          text: err?.message || 'Failed to create Drive backup.',
        });
      } finally {
        setWorkspaceLoading(false);
      }
      return;
    }

    if (action.type === 'approve' && action.app) {
      setActionLoading(true);
      setActionMessage(null);
      try {
        const remarks = action.remarks || 'Verified and approved by JMC Platform Operator';
        const { schoolId, school } = await approveSchoolApplication(
          action.app.id,
          remarks,
          user.uid,
          user.displayName || 'Platform Operator',
          user.email,
          action.app
        );

        let workspaceSummary = '';
        if (workspaceToken && workspaceConfig?.spreadsheetId) {
          try {
            const wsRes = await executeApprovalInWorkspace(
              workspaceToken,
              workspaceConfig,
              action.app,
              school,
              verification?.connectedEmail || user.email,
              remarks
            );
            workspaceSummary = ` Google Sheets updated${wsRes.driveSaved ? ', archived to Drive' : ''}${
              wsRes.emailSent ? `, and approval email sent via Gmail to ${action.app.administratorEmail}` : ''
            }.`;
          } catch (wsErr: any) {
            workspaceSummary = ` (Note: Google Workspace sync error: ${wsErr.message})`;
          }
        }

        await loadApplications();
        if (onRefreshSchools) {
          await onRefreshSchools();
        }

        setActionMessage({
          type: 'success',
          text: `School approved! Assigned School ID: ${schoolId}.${workspaceSummary}`,
        });

        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                status: 'APPROVED',
                schoolId,
                approvalDate: new Date().toISOString(),
                approvedBy: verification?.connectedEmail || user.email,
                operatorRemarks: remarks,
              }
            : null
        );
      } catch (err: any) {
        console.error('Approval failed:', err);
        setActionMessage({
          type: 'error',
          text: err.message || 'Failed to approve school application. Please try again.',
        });
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (action.type === 'reject' && action.app) {
      setActionLoading(true);
      setActionMessage(null);
      try {
        const remarks = action.remarks || 'Application did not meet verification criteria.';
        await rejectSchoolApplication(
          action.app.id,
          remarks,
          user.uid,
          user.displayName || 'Platform Operator',
          user.email,
          action.app
        );

        let workspaceSummary = '';
        if (workspaceToken && workspaceConfig?.spreadsheetId) {
          try {
            const wsRes = await executeRejectionInWorkspace(
              workspaceToken,
              workspaceConfig,
              action.app,
              verification?.connectedEmail || user.email,
              remarks
            );
            workspaceSummary = ` Google Sheets updated${wsRes.driveSaved ? ', archived to Drive' : ''}${
              wsRes.emailSent ? `, and rejection email sent via Gmail to ${action.app.administratorEmail}` : ''
            }.`;
          } catch (wsErr: any) {
            workspaceSummary = ` (Note: Google Workspace sync error: ${wsErr.message})`;
          }
        }

        await loadApplications();

        setActionMessage({
          type: 'success',
          text: `Application rejected.${workspaceSummary}`,
        });

        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                status: 'REJECTED',
                operatorRemarks: remarks,
              }
            : null
        );
      } catch (err: any) {
        console.error('Rejection failed:', err);
        setActionMessage({
          type: 'error',
          text: err.message || 'Failed to reject school application.',
        });
      } finally {
        setActionLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/20 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
              Platform Operator Control
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Signed in as <b className="text-purple-300">{user.email}</b> · Designated Automation Account:{' '}
              <b className="text-emerald-300">{PRIMARY_OPERATOR_EMAIL}</b>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadApplications()}
            disabled={loadingApps}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-all"
            title="Refresh Requests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingApps ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              workspaceToken || workspaceConfig?.appsScriptConnected
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                workspaceToken || workspaceConfig?.appsScriptConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {workspaceToken
                ? 'Workspace Connected'
                : workspaceConfig?.appsScriptConnected
                ? 'Apps Script Active'
                : 'Connect Google Office'}
            </span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Quick Add School
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'applications'
              ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4 text-amber-400" />
          <span>SCHOOL REGISTRATION REQUESTS</span>
          {pendingAppsCount > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-black">
              {pendingAppsCount} PENDING
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'workspace'
              ? 'bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>GOOGLE WORKSPACE AUTOMATION</span>
        </button>

        <button
          onClick={() => setActiveTab('schools')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'schools'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> Registered Schools ({schools.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Audit Activity Logs ({auditLogs.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION: SCHOOL REGISTRATION REQUESTS                     */}
      {/* ========================================================= */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Compact Workspace Automation Status Bar */}
          <div className="p-3.5 rounded-2xl bg-[#111624] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-white flex flex-wrap items-center gap-2">
                  <span>Google Office Automation (Drive, Sheets &amp; Gmail)</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      workspaceToken && workspaceConfig?.spreadsheetId
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {workspaceToken && workspaceConfig?.spreadsheetId
                      ? 'LIVE OAUTH SYNC READY'
                      : workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl
                      ? `APPS SCRIPT ACTIVE (${PRIMARY_OPERATOR_EMAIL})`
                      : workspaceToken
                      ? 'NEEDS INITIALIZATION'
                      : 'SETUP APPS SCRIPT OR OAUTH'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl
                    ? `Zero-env Apps Script connected as ${
                        workspaceConfig.appsScriptAccountEmail || PRIMARY_OPERATOR_EMAIL
                      } · Auto-updates Sheets, Drive & Gmail on submissions, approvals & rejections.`
                    : workspaceConfig?.spreadsheetUrl
                    ? `Database: "${WORKSPACE_SPREADSHEET_NAME}" · Sender policy: ${PRIMARY_OPERATOR_EMAIL}`
                    : `Configure Apps Script (no .env required) or Google OAuth for ${PRIMARY_OPERATOR_EMAIL} to automate Sheets, Drive & Gmail.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {workspaceConfig?.spreadsheetUrl && (
                <a
                  href={workspaceConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-blue-300 border border-white/10"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
              >
                Manage Workspace
              </button>
            </div>
          </div>

          {/* Dashboard Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#111624] border border-blue-500/20 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Total Applications
              </div>
              <div className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">
                {totalAppsCount}
              </div>
              <div className="text-[11px] text-slate-400">All submitted applications</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-amber-500/30 space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Pending Applications
              </div>
              <div className="text-2xl font-black text-amber-300 font-['Plus_Jakarta_Sans']">
                {pendingAppsCount}
              </div>
              <div className="text-[11px] text-amber-400/80">Awaiting operator review</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-emerald-500/30 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Approved Schools
              </div>
              <div className="text-2xl font-black text-emerald-300 font-['Plus_Jakarta_Sans']">
                {approvedAppsCount}
              </div>
              <div className="text-[11px] text-slate-400">Activated in Firestore &amp; Sheets</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-rose-500/20 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                Rejected Applications
              </div>
              <div className="text-2xl font-black text-rose-300 font-['Plus_Jakarta_Sans']">
                {rejectedAppsCount}
              </div>
              <div className="text-[11px] text-slate-400">Declined requests</div>
            </div>
          </div>

          {/* Filter Tabs, Search Bar & Table/Card Switch */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#111624] p-3 rounded-2xl border border-white/10">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0b0f19] rounded-xl border border-white/10">
              <button
                onClick={() => setAppStatusTab('PENDING')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  appStatusTab === 'PENDING'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>PENDING ({pendingAppsCount})</span>
              </button>

              <button
                onClick={() => setAppStatusTab('APPROVED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  appStatusTab === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>APPROVED ({approvedAppsCount})</span>
              </button>

              <button
                onClick={() => setAppStatusTab('REJECTED')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  appStatusTab === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>REJECTED ({rejectedAppsCount})</span>
              </button>

              <button
                onClick={() => setAppStatusTab('ALL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  appStatusTab === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>ALL ({totalAppsCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 lg:justify-end">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search school, email, contact, district, ID…"
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center p-1 rounded-xl bg-[#0b0f19] border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setAppViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    appViewMode === 'table' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAppViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    appViewMode === 'cards' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {appsError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{appsError}</span>
              </span>
              <button
                type="button"
                onClick={() => loadApplications()}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Applications Table or Cards View */}
          {loadingApps ? (
            <div className="p-12 text-center rounded-2xl bg-[#111624] border border-white/5 space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading school registration requests…</p>
            </div>
          ) : displayedApplications.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111624] border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No {appStatusTab} applications found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {appStatusTab === 'PENDING'
                  ? 'All submitted school registrations have been reviewed. New submissions will appear here automatically.'
                  : `There are currently no applications matching ${appStatusTab}.`}
              </p>
            </div>
          ) : appViewMode === 'table' ? (
            <div className="rounded-2xl bg-[#111624] border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0b0f19] border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4 font-bold">Registration ID</th>
                      <th className="py-3.5 px-4 font-bold">School Name &amp; Type</th>
                      <th className="py-3.5 px-4 font-bold">Email &amp; Contact Person</th>
                      <th className="py-3.5 px-4 font-bold">District &amp; Phone</th>
                      <th className="py-3.5 px-4 font-bold">Submitted</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayedApplications.map((app) => {
                      const statusBadge =
                        app.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : app.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                      return (
                        <tr key={app.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-mono font-bold text-blue-300">{app.id}</div>
                            {app.documentName && (
                              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[110px]">{app.documentName}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-bold text-white text-xs">{app.schoolName}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{app.schoolType}</div>
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <div className="text-indigo-300 font-medium">{app.administratorEmail}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{app.administratorName}</div>
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <div className="text-slate-200">{app.district}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{app.contactNumber}</div>
                          </td>
                          <td className="py-3.5 px-4 align-top text-slate-400 whitespace-nowrap">
                            {new Date(app.submissionDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <span
                              className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${statusBadge}`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 align-top text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAppDetail(app)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600/20 hover:text-blue-200 text-slate-200 border border-white/10 font-semibold transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{app.status === 'PENDING' ? 'Review' : 'Details'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedApplications.map((app) => {
                const statusBadge =
                  app.status === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : app.status === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-[#111624] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {app.id}
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${statusBadge}`}>
                          {app.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] group-hover:text-amber-300 transition-colors">
                          {app.schoolName}
                        </h3>
                        <div className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Contact: {app.administratorName}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400 border-t border-white/5 pt-2.5">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{app.administratorEmail}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{app.contactNumber}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>
                            {app.district}, {app.province}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                          <Calendar className="w-3 h-3" />
                          <span>Submitted: {new Date(app.submissionDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAppDetail(app)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-colors mt-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Details</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* APPLICATION DETAILS & APPROVAL / REJECTION MODAL           */}
          {/* ========================================================= */}
          {selectedApp && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-[#111624] border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
                <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                        {selectedApp.id}
                      </span>
                      <span
                        className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded border ${
                          selectedApp.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : selectedApp.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {selectedApp.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                      {selectedApp.schoolName}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedApp(null)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {actionMessage && (
                  <div
                    className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                      actionMessage.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {actionMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <span>{actionMessage.text}</span>
                  </div>
                )}

                <div className="overflow-y-auto py-4 flex-1 space-y-4 pr-1 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#171d2d] p-4 rounded-xl border border-white/10">
                    <div>
                      <span className="text-slate-400 block text-[11px]">School Name</span>
                      <span className="font-semibold text-white text-sm">{selectedApp.schoolName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">School Type</span>
                      <span className="font-semibold text-white">{selectedApp.schoolType}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact Person</span>
                      <span className="font-semibold text-white">{selectedApp.administratorName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Principal Name</span>
                      <span className="font-semibold text-white">{selectedApp.principalName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Official School Email</span>
                      <span className="font-semibold text-indigo-300 break-all">
                        {selectedApp.administratorEmail}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone Number</span>
                      <span className="font-semibold text-white">{selectedApp.contactNumber}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">District / Province</span>
                      <span className="font-semibold text-white">
                        {selectedApp.district}, {selectedApp.province}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Address</span>
                      <span className="font-semibold text-white">{selectedApp.address}</span>
                    </div>

                    {selectedApp.website && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">School Website</span>
                        <a
                          href={selectedApp.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{selectedApp.website}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {selectedApp.additionalInfo && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">Additional Information</span>
                        <p className="text-slate-200 bg-[#111624] p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap">
                          {selectedApp.additionalInfo}
                        </p>
                      </div>
                    )}

                    {(selectedApp.documentName || selectedApp.driveFileUrl) && (
                      <div className="sm:col-span-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <Paperclip className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">
                            {selectedApp.documentName || 'Supporting Document'}
                            {selectedApp.documentSize
                              ? ` (${Math.round(selectedApp.documentSize / 1024)} KB)`
                              : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedApp.driveFileUrl && (
                            <a
                              href={selectedApp.driveFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                            >
                              <span>Open in Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {selectedApp.hasPendingDocumentUpload && (
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(selectedApp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold"
                            >
                              Download Attachment
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="sm:col-span-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                      <span>Submitted: {new Date(selectedApp.submissionDate).toLocaleString()}</span>
                      {selectedApp.schoolId && (
                        <span className="text-emerald-400 font-mono font-bold">
                          Assigned School ID: {selectedApp.schoolId}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedApp.status !== 'PENDING' && selectedApp.operatorRemarks && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Operator Notes
                      </span>
                      <p className="text-xs text-slate-200">{selectedApp.operatorRemarks}</p>
                    </div>
                  )}

                  {selectedApp.status === 'PENDING' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Operator Notes / Rejection Reason{' '}
                          <span className="text-slate-500">
                            (Saved to Google Sheets &amp; included in email notification)
                          </span>
                        </label>
                        <textarea
                          rows={2}
                          value={operatorRemarks}
                          onChange={(e) => setOperatorRemarks(e.target.value)}
                          placeholder="e.g. Verified institution details and authorized email."
                          className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="p-4 rounded-xl bg-[#171d2d] border border-white/10 space-y-3">
                        <div className="text-xs text-slate-300">
                          <span className="font-bold text-white">Operator Approval &amp; Email Dispatch:</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            {workspaceToken && workspaceConfig?.spreadsheetId
                              ? `Connected to Google Workspace (${verification?.connectedEmail || PRIMARY_OPERATOR_EMAIL}). You will be asked to confirm Sheets, Drive & Gmail updates before execution.`
                              : workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl
                              ? `Zero-env Google Apps Script automation active for ${
                                  workspaceConfig.appsScriptAccountEmail || PRIMARY_OPERATOR_EMAIL
                                }. Google Sheets, Drive & Gmail notices execute automatically upon confirmation.`
                              : 'Connect Apps Script or Google Workspace OAuth in the Google Workspace Automation tab to also update Google Sheets, archive to Drive, and send Gmail notifications automatically.'}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-1">
                          <button
                            type="button"
                            onClick={requestRejectConfirmation}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>REJECT APPLICATION</span>
                          </button>

                          <button
                            type="button"
                            onClick={requestApproveConfirmation}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>APPROVE SCHOOL</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: GOOGLE WORKSPACE AUTOMATION SYSTEM               */}
      {/* ========================================================= */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {workspaceNotice && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
                workspaceNotice.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                  : workspaceNotice.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-200'
              }`}
            >
              {workspaceNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : workspaceNotice.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <KeyRound className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
              )}
              <span className="leading-relaxed">{workspaceNotice.text}</span>
            </div>
          )}

          {/* Account & Alias Verification Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#111624] border border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Step 1 · OAuth Authorization &amp; Alias Check
                  </span>
                  <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans'] mt-0.5">
                    Google Workspace Account
                  </h2>
                </div>
                <KeyRound className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Primary designated operator account: <b className="text-white">{PRIMARY_OPERATOR_EMAIL}</b>.
                Authorize Google Drive, Google Sheets, and Gmail to verify whether this email is a direct Google
                Workspace account, a verified Gmail Send-As alias, or an alias needing Reply-To configuration.
              </p>

              {!workspaceToken ? (
                <div className="pt-1">
                  {/* Official Google Sign-In Material button style */}
                  <button
                    type="button"
                    onClick={handleConnectWorkspace}
                    disabled={workspaceLoading}
                    className="inline-flex items-center justify-center gap-3 h-10 px-4 rounded-full bg-white hover:bg-[#f8f9fa] text-[#1f1f1f] border border-[#747775] font-medium text-sm shadow-sm transition-all disabled:opacity-60"
                  >
                    {workspaceLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#1f1f1f]" />
                    ) : (
                      <GoogleLogoSvg className="w-[18px] h-[18px]" />
                    )}
                    <span>Sign in with Google</span>
                  </button>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Grants memory-only access tokens for Drive (<code className="text-slate-300">drive.file</code>),
                    Sheets (<code className="text-slate-300">spreadsheets</code>), and Gmail (
                    <code className="text-slate-300">gmail.send</code>,{' '}
                    <code className="text-slate-300">gmail.readonly</code>).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Authorized Google Account</span>
                      <span className="font-bold text-emerald-300">
                        {verification?.connectedEmail || workspaceConfig?.connectedGoogleEmail || 'Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Drive &amp; Sheets API</span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {verification?.canAuthorizeDriveAndSheets ? 'Authorized' : 'Connected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Gmail Send Capability</span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" />
                        {verification?.canSendEmail ? 'Ready' : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Sender Alias Mode</span>
                      <span className="font-mono font-bold text-blue-300">
                        {verification?.aliasMode || workspaceConfig?.aliasMode || 'verified'}
                      </span>
                    </div>
                  </div>

                  {verification?.availableSendAsAliases && verification.availableSendAsAliases.length > 0 && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] space-y-1">
                      <div className="font-bold text-slate-300">Detected Gmail Send-As Aliases:</div>
                      {verification.availableSendAsAliases.map((alias) => (
                        <div key={alias.sendAsEmail} className="flex items-center justify-between text-slate-400">
                          <span>{alias.sendAsEmail}</span>
                          <span className="text-emerald-400 font-semibold">
                            {alias.isPrimary ? 'Primary' : alias.verificationStatus || 'verified'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConnectWorkspace}
                      disabled={workspaceLoading}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10"
                    >
                      Switch / Re-verify Account
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectWorkspace}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/20"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Clear Token</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Drive Folders & Sheets Database Control Card */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#111624] border border-white/10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Step 2 · Drive &amp; Sheets Infrastructure
                  </span>
                  <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans'] mt-0.5">
                    Automated Folders &amp; Database
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={requestProvisionConfirmation}
                  disabled={!workspaceToken || workspaceLoading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition-all"
                >
                  {workspaceLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderOpen className="w-4 h-4" />
                  )}
                  <span>
                    {workspaceConfig?.configured ? 'Verify Folders & Database' : 'Initialize Drive & Sheets'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Google Drive Card */}
                <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-amber-400" />
                      <span>{WORKSPACE_ROOT_FOLDER_NAME}</span>
                    </span>
                    {workspaceConfig?.rootFolderUrl && (
                      <a
                        href={workspaceConfig.rootFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Open Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    {Object.entries(SUBFOLDER_NAMES).map(([key, label]) => {
                      const folderId = workspaceConfig?.subfolders?.[key as keyof typeof SUBFOLDER_NAMES];
                      return (
                        <li key={key} className="flex items-center justify-between">
                          <span>• {label}</span>
                          <span className={folderId ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                            {folderId ? 'Ready' : 'Pending'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Google Sheets Card */}
                <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white flex items-center gap-1.5 truncate">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">School Registration DB</span>
                    </span>
                    {workspaceConfig?.spreadsheetUrl && (
                      <a
                        href={workspaceConfig.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[11px] shrink-0"
                      >
                        <span>Open Sheet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    {Object.values(SHEET_TABS).map((tabName) => (
                      <li key={tabName} className="flex items-center justify-between">
                        <span>• {tabName}</span>
                        <span className={workspaceConfig?.spreadsheetId ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {workspaceConfig?.spreadsheetId ? 'Configured' : 'Pending'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {workspaceConfig?.lastSyncedAt && (
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-white/10">
                      Last synced: {new Date(workspaceConfig.lastSyncedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmed Workspace Operations */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={requestSyncConfirmation}
                  disabled={!workspaceToken || !workspaceConfig?.spreadsheetId || workspaceLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-200 text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Applications &amp; Attachments</span>
                </button>

                <button
                  type="button"
                  onClick={requestReportConfirmation}
                  disabled={!workspaceToken || !workspaceConfig?.subfolders?.systemReports || workspaceLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-200 text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  <FileBarChart2 className="w-3.5 h-3.5" />
                  <span>Generate System Report to Drive</span>
                </button>

                <button
                  type="button"
                  onClick={requestBackupConfirmation}
                  disabled={!workspaceToken || !workspaceConfig?.subfolders?.backups || workspaceLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  <DatabaseBackup className="w-3.5 h-3.5" />
                  <span>Create JSON Backup in Drive</span>
                </button>
              </div>
            </div>
          </div>

          {/* Zero-Environment-Variable Google Apps Script Automation Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#111624] border border-indigo-500/25 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    Zero Environment Variables · 24/7 Background Automation
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                      workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl
                      ? 'CONNECTED & VERIFIED'
                      : 'READY TO LINK'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans'] mt-1 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Google Apps Script Automation ({PRIMARY_OPERATOR_EMAIL})</span>
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                  Runs Google Drive archiving, 4-tab Google Sheets sync, and Gmail approval/rejection emails directly
                  under <b className="text-white">{PRIMARY_OPERATOR_EMAIL}</b> — even when no operator browser is open.
                  No <code className="text-indigo-300">.env</code> file or server environment variables required.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCodeGs}
                  disabled={codeGsLoading}
                  className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {codeGsCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{codeGsCopied ? 'Copied Code.gs' : 'Copy Code.gs'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCodeGs}
                  disabled={codeGsLoading}
                  className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Code.gs</span>
                </button>
              </div>
            </div>

            {/* 4-Step No-Env Deployment Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-white/10 space-y-1">
                <div className="text-[11px] font-bold text-indigo-400">1. Open Apps Script</div>
                <p className="text-slate-400 leading-relaxed">
                  Sign into{' '}
                  <a
                    href="https://script.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline font-medium"
                  >
                    script.google.com
                  </a>{' '}
                  as <b className="text-slate-200">{PRIMARY_OPERATOR_EMAIL}</b> and create a new project.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-white/10 space-y-1">
                <div className="text-[11px] font-bold text-indigo-400">2. Paste Code.gs</div>
                <p className="text-slate-400 leading-relaxed">
                  Click <b className="text-slate-200">Copy Code.gs</b> above and paste the script into the editor, then
                  save.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-white/10 space-y-1">
                <div className="text-[11px] font-bold text-indigo-400">3. Deploy Web App</div>
                <p className="text-slate-400 leading-relaxed">
                  Click <b className="text-slate-200">Deploy → New deployment → Web app</b>. Set Execute as:{' '}
                  <b className="text-slate-200">Me</b> &amp; Access: <b className="text-slate-200">Anyone</b>.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-white/10 space-y-1">
                <div className="text-[11px] font-bold text-indigo-400">4. Save &amp; Verify Here</div>
                <p className="text-slate-400 leading-relaxed">
                  Paste the <code className="text-indigo-300">/exec</code> URL below. Stored in Firestore &amp; backend
                  with zero <code className="text-indigo-300">.env</code> edits.
                </p>
              </div>
            </div>

            {/* Web App URL Form */}
            <form onSubmit={handleVerifyAppsScriptUrl} className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Google Apps Script Web App URL (<span className="text-emerald-400">{PRIMARY_OPERATOR_EMAIL}</span>)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={appsScriptUrlInput}
                    onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full min-h-[44px] bg-[#0b0f19] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={appsScriptBusy || !appsScriptUrlInput.trim()}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-40 transition-all shrink-0"
                >
                  {appsScriptBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{workspaceConfig?.appsScriptConnected ? 'Re-Verify & Save URL' : 'Verify & Activate Automation'}</span>
                </button>
                {workspaceConfig?.appsScriptConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectAppsScript}
                    disabled={appsScriptBusy}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-semibold disabled:opacity-40 transition-colors shrink-0"
                  >
                    <Unlink className="w-4 h-4" />
                    <span>Unlink</span>
                  </button>
                )}
              </div>
            </form>

            {/* Live Apps Script Diagnostics & Server-Side Actions */}
            {workspaceConfig?.appsScriptConnected && workspaceConfig?.appsScriptUrl && (
              <div className="p-4 rounded-xl bg-[#0b0f19] border border-emerald-500/25 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">Executing Google Account</div>
                    <div className="font-bold text-emerald-300 truncate">
                      {workspaceConfig.appsScriptAccountEmail || PRIMARY_OPERATOR_EMAIL}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Gmail Alias Policy</div>
                    <div className="font-mono font-bold text-blue-300">
                      {workspaceConfig.appsScriptAliasMode || 'direct_account'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Last Verified</div>
                    <div className="text-slate-200">
                      {workspaceConfig.appsScriptLastVerifiedAt
                        ? new Date(workspaceConfig.appsScriptLastVerifiedAt).toLocaleString()
                        : 'Verified'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRunAppsScriptAction('setupWorkspace')}
                    disabled={appsScriptBusy}
                    className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Verify Folders &amp; Sheets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAppsScriptAction('syncApplications')}
                    disabled={appsScriptBusy}
                    className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-200 text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${appsScriptBusy ? 'animate-spin' : ''}`} />
                    <span>Sync All Registrations ({applications.length}) &amp; Schools ({schools.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAppsScriptAction('generateReport')}
                    disabled={appsScriptBusy}
                    className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-200 text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    <FileBarChart2 className="w-3.5 h-3.5" />
                    <span>Run Apps Script Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAppsScriptAction('backupDatabase')}
                    disabled={appsScriptBusy}
                    className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    <DatabaseBackup className="w-3.5 h-3.5" />
                    <span>Run Apps Script Backup</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: REGISTERED SCHOOLS                               */}
      {/* ========================================================= */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schools by name, admin email, district…"
                className="w-full bg-[#121724] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredSchools.length} of {schools.length} schools
            </span>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
                <SchoolIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No schools have been added yet.</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Review pending registration requests or click &quot;Quick Add School&quot; to onboard an institution.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map((sch) => {
                const isSelected = currentSchool?.id === sch.id;
                return (
                  <div
                    key={sch.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'bg-purple-900/20 border-purple-500/40 shadow-lg shadow-purple-500/10'
                        : 'bg-[#121724] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {sch.schoolType || 'National School'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">{sch.academicYear || '2026'}</span>
                      </div>

                      <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] line-clamp-1">
                        {sch.name}
                      </h3>

                      <div className="space-y-1 text-xs text-slate-400">
                        <div>
                          Principal: <b className="text-slate-300">{sch.principalName || 'Not Set'}</b>
                        </div>
                        <div>
                          District: <b className="text-slate-300">{sch.district || 'Jaffna'}</b>,{' '}
                          {sch.province || 'Northern'}
                        </div>
                        <div className="truncate">
                          Admin Email: <b className="text-purple-300">{sch.adminEmail || sch.administratorEmail}</b>
                        </div>
                        {(sch.phone || sch.contactNumber) && (
                          <div>
                            Phone: <b className="text-slate-300">{sch.phone || sch.contactNumber}</b>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      <button
                        onClick={() => onSelectSchool(sch)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                          isSelected ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Currently Selected' : 'Select Scope'}
                      </button>

                      {confirmDeleteSchoolId === sch.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteSchool(sch.id);
                              setConfirmDeleteSchoolId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSchoolId(null)}
                            className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSchoolId(sch.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete School"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: AUDIT ACTIVITY LOGS                              */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Security &amp; Administrative Event Audit Trail</h2>
            <span className="text-xs text-slate-400">{auditLogs.length} total events recorded</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101420] border border-white/5 space-y-2">
              <ClipboardList className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No administrative events logged yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 rounded-2xl bg-[#101420] border border-white/10 overflow-hidden">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.02]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{log.action}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-purple-300 border border-white/10">
                        {log.actorRole}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Actor: <b className="text-slate-300">{log.actorName}</b> on target{' '}
                      <b className="text-slate-300">{log.targetType}</b> ({log.targetId})
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* EXPLICIT USER CONFIRMATION DIALOG FOR WORKSPACE MUTATIONS */}
      {/* ========================================================= */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#151a28] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    pendingConfirm.type === 'reject'
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                    {pendingConfirm.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Explicit Operator Confirmation Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{pendingConfirm.description}</p>

            <ul className="p-3.5 rounded-xl bg-[#0b0f19] border border-white/10 space-y-2 text-xs text-slate-200">
              {pendingConfirm.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                  pendingConfirm.type === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                Confirm &amp; Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a28] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] mb-4">
              Add New Educational Institution
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">School Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mahajana College, Tellippalai"
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Administrator Google Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="e.g. principal@mahajana.lk"
                  className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Principal Name</label>
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    placeholder="e.g. Mr. K. Pushparathanam"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Province</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="076 391 XXXX"
                    className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
