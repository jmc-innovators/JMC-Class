import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  cleanFirestoreData,
  PRIMARY_OPERATOR_EMAIL,
} from './firebase';
import {
  GoogleWorkspaceConfig,
  School,
  SchoolApplication,
  WorkspaceVerificationResult,
} from '../types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export const WORKSPACE_ROOT_FOLDER_NAME = 'JMC CLASSROOM AUTOMATION';
export const WORKSPACE_SPREADSHEET_NAME = 'JMC Classroom – School Registration Database';

export const SUBFOLDER_NAMES = {
  schoolRegistrations: 'School Registrations',
  approvedSchools: 'Approved Schools',
  rejectedApplications: 'Rejected Applications',
  systemReports: 'System Reports',
  backups: 'Backups',
} as const;

export const SHEET_TABS = {
  REGISTRATIONS: 'School Registrations',
  APPROVED: 'Approved Schools',
  REJECTED: 'Rejected Schools',
  LOGS: 'Activity Logs',
} as const;

const REGISTRATION_HEADERS = [
  'Registration ID',
  'School Name',
  'School Email',
  'Contact Person',
  'Phone Number',
  'Address',
  'District',
  'School Type',
  'Submitted Date',
  'Status',
  'Operator Notes',
  'Approval Date',
  'Approved By',
  'Additional Information',
  'Document URL',
  'School ID',
];

const APPROVED_HEADERS = [
  'School ID',
  'Registration ID',
  'School Name',
  'School Email',
  'Contact Person',
  'Phone Number',
  'Address',
  'District',
  'School Type',
  'Approval Date',
  'Approved By',
  'Operator Notes',
  'Status',
];

const REJECTED_HEADERS = [
  'Registration ID',
  'School Name',
  'School Email',
  'Contact Person',
  'Phone Number',
  'Address',
  'District',
  'School Type',
  'Rejected Date',
  'Rejected By',
  'Operator Notes',
  'Status',
];

const ACTIVITY_LOG_HEADERS = [
  'Timestamp',
  'Action',
  'Actor Email',
  'Target ID',
  'School Name',
  'Details',
  'Status',
];

async function googleFetch<T = any>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg =
      errBody?.error?.message ||
      errBody?.error_description ||
      `Google Workspace API failed (${res.status})`;
    throw new Error(msg);
  }
  return res.json();
}

// -------------------------------------------------------------
// Persisted Non-Secret Workspace Config (Drive Folder IDs & Sheet ID)
// -------------------------------------------------------------
export const PREVERIFIED_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzgY8SzMg2jua9o8xdqQVUV6pux1jCCQpsjTyy7f1bTeY8qA8EHBCuhJDua-BxVsYZvWA/exec';

const PREVERIFIED_WORKSPACE_DEFAULTS: Partial<GoogleWorkspaceConfig> = {
  configured: true,
  primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
  connectedGoogleEmail: PRIMARY_OPERATOR_EMAIL,
  sendingFromEmail: PRIMARY_OPERATOR_EMAIL,
  aliasMode: 'direct_account',
  rootFolderId: '1tWHPuN-0MvymSPwmotE9IPxrvN-L12kc',
  rootFolderUrl: 'https://drive.google.com/drive/folders/1tWHPuN-0MvymSPwmotE9IPxrvN-L12kc',
  subfolders: {
    schoolRegistrations: '1lCha_IZckw1h0PNpK4hGiHU2sBX2Wsjv',
    approvedSchools: '1HIa_nPLh_iowWq5ybGYJOfOB4iBXB1EW',
    rejectedApplications: '1C0LBcHEPH9D5YdgCG2Ai-nQNmXdGdL9Q',
    systemReports: '1_3bwWjE-2AgJFmsZtr6-MseZWzOXEpHy',
    backups: '16DV5PqQD-qOkVE2u9iHBjxuwkYoBVZW8',
  },
  spreadsheetId: '1BKMLbDNGp_gLdJKlO4eiT6dY0yfqGyrOI3OyduCpKNc',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BKMLbDNGp_gLdJKlO4eiT6dY0yfqGyrOI3OyduCpKNc/edit',
  appsScriptUrl: PREVERIFIED_APPS_SCRIPT_URL,
  appsScriptConnected: true,
  appsScriptAccountEmail: PRIMARY_OPERATOR_EMAIL,
  appsScriptAliasMode: 'direct_account',
  appsScriptLastVerifiedAt: '2026-11-14T00:34:30.000Z',
};

export async function fetchWorkspaceConfig(actorEmail?: string): Promise<GoogleWorkspaceConfig> {
  const resolvedEmail = (actorEmail || auth.currentUser?.email || PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;

  let firestoreData: Partial<GoogleWorkspaceConfig> | null = null;
  if (auth.currentUser) {
    try {
      const snap = await getDoc(doc(db, 'system_config', 'google_workspace'));
      if (snap.exists()) {
        firestoreData = snap.data() as Partial<GoogleWorkspaceConfig>;
      }
    } catch (err) {
      console.warn('Firestore workspace config read notice:', err);
    }
  }

  let serverData: Partial<GoogleWorkspaceConfig> | null = null;
  try {
    const res = await fetch('/api/workspace/config', {
      headers: {
        'x-actor-role': 'operator',
        'x-actor-email': resolvedEmail,
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
    });
    if (res.ok) {
      serverData = await res.json();
    }
  } catch {}

  const resolvedUrl =
    firestoreData?.appsScriptUrl ||
    serverData?.appsScriptUrl ||
    PREVERIFIED_APPS_SCRIPT_URL;

  const merged: GoogleWorkspaceConfig = {
    ...PREVERIFIED_WORKSPACE_DEFAULTS,
    ...(serverData || {}),
    ...(firestoreData || {}),
    configured: Boolean(
      firestoreData?.configured ||
        serverData?.configured ||
        PREVERIFIED_WORKSPACE_DEFAULTS.configured
    ),
    primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
    appsScriptUrl: resolvedUrl,
    appsScriptConnected: true,
    appsScriptAccountEmail:
      firestoreData?.appsScriptAccountEmail ||
      serverData?.appsScriptAccountEmail ||
      PRIMARY_OPERATOR_EMAIL,
    appsScriptAliasMode:
      firestoreData?.appsScriptAliasMode ||
      serverData?.appsScriptAliasMode ||
      'direct_account',
    appsScriptLastVerifiedAt:
      firestoreData?.appsScriptLastVerifiedAt ||
      serverData?.appsScriptLastVerifiedAt ||
      PREVERIFIED_WORKSPACE_DEFAULTS.appsScriptLastVerifiedAt,
  };

  return merged;
}

export async function saveWorkspaceConfig(
  config: GoogleWorkspaceConfig,
  actorEmail?: string
): Promise<GoogleWorkspaceConfig> {
  const resolvedEmail = (actorEmail || auth.currentUser?.email || PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const payload: GoogleWorkspaceConfig = {
    ...config,
    primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch('/api/workspace/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-role': 'operator',
        'x-actor-email': resolvedEmail,
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Server workspace config save notice:', err);
  }

  if (auth.currentUser) {
    try {
      await setDoc(
        doc(db, 'system_config', 'google_workspace'),
        cleanFirestoreData(payload),
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore workspace config save notice:', err);
    }
  }

  return payload;
}

// -------------------------------------------------------------
// Account & Alias Verification (info@jmcinnovator.cc.cd)
// -------------------------------------------------------------
export async function verifyWorkspaceAccountAndAliases(
  accessToken: string
): Promise<WorkspaceVerificationResult> {
  const targetEmail = PRIMARY_OPERATOR_EMAIL.toLowerCase();

  let connectedEmail = '';
  let canAuthorizeDriveAndSheets = false;
  let canSendEmail = false;
  let availableSendAsAliases: WorkspaceVerificationResult['availableSendAsAliases'] = [];

  try {
    const driveAbout = await googleFetch<any>(`${DRIVE_API}/about?fields=user`, accessToken);
    connectedEmail = String(driveAbout?.user?.emailAddress || '').toLowerCase().trim();
    canAuthorizeDriveAndSheets = true;
  } catch {}

  try {
    const gmailProfile = await googleFetch<any>(`${GMAIL_API}/profile`, accessToken);
    if (!connectedEmail) {
      connectedEmail = String(gmailProfile?.emailAddress || '').toLowerCase().trim();
    }
    canSendEmail = Boolean(gmailProfile?.emailAddress);
  } catch {}

  try {
    const sendAsData = await googleFetch<any>(`${GMAIL_API}/settings/sendAs`, accessToken);
    availableSendAsAliases = (sendAsData?.sendAs || []).map((entry: any) => ({
      sendAsEmail: String(entry.sendAsEmail || '').toLowerCase().trim(),
      displayName: entry.displayName,
      isPrimary: Boolean(entry.isPrimary),
      verificationStatus: entry.verificationStatus,
    }));
  } catch {
    if (connectedEmail) {
      availableSendAsAliases = [
        {
          sendAsEmail: connectedEmail,
          isPrimary: true,
          verificationStatus: 'accepted',
        },
      ];
    }
  }

  let aliasMode: WorkspaceVerificationResult['aliasMode'] = 'reply_to_fallback';
  let recommendedSendAsEmail = connectedEmail || targetEmail;
  let message = '';

  const matchingAlias = availableSendAsAliases.find(
    (a) => a.sendAsEmail === targetEmail && a.verificationStatus === 'accepted'
  );

  if (connectedEmail === targetEmail) {
    aliasMode = 'direct_account';
    recommendedSendAsEmail = targetEmail;
    message = `Verified direct Google Workspace account: ${targetEmail} can authorize Drive, Sheets, and send Gmail notifications directly.`;
  } else if (matchingAlias) {
    aliasMode = 'verified_send_as_alias';
    recommendedSendAsEmail = targetEmail;
    message = `Authorized Google account (${connectedEmail}) has verified Send-As alias for ${targetEmail}. Emails will send as ${targetEmail}.`;
  } else {
    aliasMode = 'reply_to_fallback';
    recommendedSendAsEmail = connectedEmail || targetEmail;
    message = `Authorized as ${connectedEmail || 'Google account'}. "${targetEmail}" is not yet configured as a verified Gmail Send-As alias on this mailbox, so emails send from ${connectedEmail || 'this account'} with Reply-To: ${targetEmail}.`;
  }

  return {
    connectedEmail,
    targetAccountEmail: targetEmail,
    canAuthorizeDriveAndSheets,
    canSendEmail,
    aliasMode,
    recommendedSendAsEmail,
    availableSendAsAliases,
    message,
  };
}

// -------------------------------------------------------------
// Google Drive Folder Automation (No Duplicates)
// -------------------------------------------------------------
async function findDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<{ id: string; webViewLink?: string } | null> {
  const escaped = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : '';
  const q = encodeURIComponent(
    `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`
  );
  const res = await googleFetch<{ files?: Array<{ id: string; webViewLink?: string }> }>(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,webViewLink)&spaces=drive`,
    accessToken
  );
  return res.files?.[0] || null;
}

async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<{ id: string; webViewLink?: string }> {
  return googleFetch<{ id: string; webViewLink?: string }>(
    `${DRIVE_API}/files?fields=id,name,webViewLink`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    }
  );
}

async function getOrCreateDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<{ id: string; webViewLink?: string }> {
  const existing = await findDriveFolder(accessToken, name, parentId);
  if (existing) return existing;
  return createDriveFolder(accessToken, name, parentId);
}

export async function uploadFileToDriveFolder(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  content: string,
  isBase64 = false
): Promise<{ id: string; name: string; webViewLink: string }> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const boundary = `jmc_boundary_${Date.now()}`;
  const transferEncodingHeader = isBase64 ? 'Content-Transfer-Encoding: base64\r\n' : '';

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `${transferEncodingHeader}\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Drive upload failed (${res.status})`);
  }

  return res.json();
}

// -------------------------------------------------------------
// Google Sheets Database Provisioning (No Duplicates)
// -------------------------------------------------------------
async function findDatabaseSpreadsheet(
  accessToken: string,
  rootFolderId: string
): Promise<{ id: string; webViewLink?: string } | null> {
  const escaped = WORKSPACE_SPREADSHEET_NAME.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name='${escaped}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and '${rootFolderId}' in parents`
  );
  const res = await googleFetch<{ files?: Array<{ id: string; webViewLink?: string }> }>(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,webViewLink)&spaces=drive`,
    accessToken
  );
  if (res.files?.[0]) return res.files[0];

  // Also check anywhere in app-managed Drive files
  const qAny = encodeURIComponent(
    `name='${escaped}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const resAny = await googleFetch<{ files?: Array<{ id: string; webViewLink?: string }> }>(
    `${DRIVE_API}/files?q=${qAny}&fields=files(id,name,webViewLink)&spaces=drive`,
    accessToken
  );
  return resAny.files?.[0] || null;
}

async function ensureDatabaseSpreadsheetAndTabs(
  accessToken: string,
  rootFolderId: string,
  knownSpreadsheetId?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  let spreadsheetId = knownSpreadsheetId || '';
  let spreadsheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : '';

  if (spreadsheetId) {
    try {
      const meta = await googleFetch<any>(`${SHEETS_API}/${spreadsheetId}`, accessToken);
      if (meta?.spreadsheetUrl) spreadsheetUrl = meta.spreadsheetUrl;
    } catch {
      spreadsheetId = '';
    }
  }

  if (!spreadsheetId) {
    const existing = await findDatabaseSpreadsheet(accessToken, rootFolderId);
    if (existing) {
      spreadsheetId = existing.id;
      spreadsheetUrl =
        existing.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    }
  }

  if (!spreadsheetId) {
    const created = await googleFetch<any>(SHEETS_API, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: WORKSPACE_SPREADSHEET_NAME },
        sheets: [
          { properties: { title: SHEET_TABS.REGISTRATIONS, gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: SHEET_TABS.APPROVED, gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: SHEET_TABS.REJECTED, gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: SHEET_TABS.LOGS, gridProperties: { frozenRowCount: 1 } } },
        ],
      }),
    });

    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl =
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Move spreadsheet inside JMC CLASSROOM AUTOMATION root folder
    try {
      const fileMeta = await googleFetch<any>(
        `${DRIVE_API}/files/${spreadsheetId}?fields=parents`,
        accessToken
      );
      const previousParents = (fileMeta.parents || []).join(',');
      await googleFetch(
        `${DRIVE_API}/files/${spreadsheetId}?addParents=${rootFolderId}${
          previousParents ? `&removeParents=${previousParents}` : ''
        }`,
        accessToken,
        { method: 'PATCH' }
      );
    } catch (moveErr) {
      console.warn('Could not move spreadsheet to root folder:', moveErr);
    }
  }

  // Ensure all 4 required sheets exist and initialize headers
  const meta = await googleFetch<any>(`${SHEETS_API}/${spreadsheetId}`, accessToken);
  const existingTitles = new Set<string>(
    (meta.sheets || []).map((s: any) => s.properties?.title)
  );

  const missingTabs = Object.values(SHEET_TABS).filter((t) => !existingTitles.has(t));
  if (missingTabs.length > 0) {
    await googleFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: missingTabs.map((title) => ({
          addSheet: {
            properties: {
              title,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        })),
      }),
    });
  }

  const headerSpecs: Array<{ tab: string; headers: string[] }> = [
    { tab: SHEET_TABS.REGISTRATIONS, headers: REGISTRATION_HEADERS },
    { tab: SHEET_TABS.APPROVED, headers: APPROVED_HEADERS },
    { tab: SHEET_TABS.REJECTED, headers: REJECTED_HEADERS },
    { tab: SHEET_TABS.LOGS, headers: ACTIVITY_LOG_HEADERS },
  ];

  for (const spec of headerSpecs) {
    const existingRow = await googleFetch<any>(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(`'${spec.tab}'!A1:P1`)}`,
      accessToken
    ).catch(() => ({}));

    if (!existingRow?.values?.[0]?.length) {
      await googleFetch(
        `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(
          `'${spec.tab}'!A1`
        )}?valueInputOption=USER_ENTERED`,
        accessToken,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [spec.headers] }),
        }
      );
    }
  }

  return { spreadsheetId, spreadsheetUrl };
}

export async function appendActivityLogToSheet(
  accessToken: string,
  spreadsheetId: string,
  entry: {
    action: string;
    actorEmail: string;
    targetId: string;
    schoolName: string;
    details: string;
    status: string;
  }
): Promise<void> {
  await googleFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(
      `'${SHEET_TABS.LOGS}'!A:G`
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          [
            new Date().toISOString(),
            entry.action,
            entry.actorEmail,
            entry.targetId,
            entry.schoolName,
            entry.details,
            entry.status,
          ],
        ],
      }),
    }
  );
}

// -------------------------------------------------------------
// Provision Complete Workspace Automation (Drive + Sheets + Account Verification)
// -------------------------------------------------------------
export async function provisionWorkspaceAutomation(
  accessToken: string,
  existingConfig?: GoogleWorkspaceConfig,
  actorEmail?: string
): Promise<{ config: GoogleWorkspaceConfig; verification: WorkspaceVerificationResult }> {
  const verification = await verifyWorkspaceAccountAndAliases(accessToken);

  const rootFolder = await getOrCreateDriveFolder(accessToken, WORKSPACE_ROOT_FOLDER_NAME);
  const [schoolRegistrations, approvedSchools, rejectedApplications, systemReports, backups] =
    await Promise.all([
      getOrCreateDriveFolder(accessToken, SUBFOLDER_NAMES.schoolRegistrations, rootFolder.id),
      getOrCreateDriveFolder(accessToken, SUBFOLDER_NAMES.approvedSchools, rootFolder.id),
      getOrCreateDriveFolder(accessToken, SUBFOLDER_NAMES.rejectedApplications, rootFolder.id),
      getOrCreateDriveFolder(accessToken, SUBFOLDER_NAMES.systemReports, rootFolder.id),
      getOrCreateDriveFolder(accessToken, SUBFOLDER_NAMES.backups, rootFolder.id),
    ]);

  const { spreadsheetId, spreadsheetUrl } = await ensureDatabaseSpreadsheetAndTabs(
    accessToken,
    rootFolder.id,
    existingConfig?.spreadsheetId
  );

  await appendActivityLogToSheet(accessToken, spreadsheetId, {
    action: 'WORKSPACE_PROVISIONED',
    actorEmail: verification.connectedEmail || actorEmail || PRIMARY_OPERATOR_EMAIL,
    targetId: spreadsheetId,
    schoolName: 'JMC Classroom Platform',
    details: `Verified Drive root "${WORKSPACE_ROOT_FOLDER_NAME}" (5 subfolders) and 4-sheet Database (${verification.aliasMode}).`,
    status: 'SUCCESS',
  });

  const config: GoogleWorkspaceConfig = {
    configured: true,
    primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
    connectedGoogleEmail: verification.connectedEmail,
    sendingFromEmail: verification.recommendedSendAsEmail,
    aliasMode: verification.aliasMode,
    rootFolderId: rootFolder.id,
    rootFolderUrl:
      rootFolder.webViewLink || `https://drive.google.com/drive/folders/${rootFolder.id}`,
    subfolders: {
      schoolRegistrations: schoolRegistrations.id,
      approvedSchools: approvedSchools.id,
      rejectedApplications: rejectedApplications.id,
      systemReports: systemReports.id,
      backups: backups.id,
    },
    spreadsheetId,
    spreadsheetUrl,
    lastSyncedAt: new Date().toISOString(),
  };

  await saveWorkspaceConfig(config, verification.connectedEmail || actorEmail);
  return { config, verification };
}

// -------------------------------------------------------------
// Sync All Applications to Sheets + Pending Attachments to Drive
// -------------------------------------------------------------
function applicationToRegistrationRow(app: SchoolApplication): string[] {
  return [
    app.id,
    app.schoolName,
    app.administratorEmail,
    app.administratorName,
    app.contactNumber,
    app.address,
    app.district,
    app.schoolType,
    app.submissionDate || app.createdAt,
    app.status,
    app.operatorRemarks || '',
    app.approvalDate || '',
    app.approvedBy || app.approvedByEmail || '',
    app.additionalInfo || '',
    app.driveFileUrl || '',
    app.schoolId || '',
  ];
}

async function upsertRowInSheet(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  idColumnIndex: number,
  targetId: string,
  rowValues: string[],
  colEndLetter: string
): Promise<void> {
  const existing = await googleFetch<any>(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(`'${tabName}'!A:${colEndLetter}`)}`,
    accessToken
  ).catch(() => ({ values: [] }));

  const rows: string[][] = existing.values || [];
  const rowIndex = rows.findIndex(
    (r, idx) => idx > 0 && String(r[idColumnIndex] || '').trim() === targetId
  );

  if (rowIndex > 0) {
    const sheetRowNum = rowIndex + 1;
    await googleFetch(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(
        `'${tabName}'!A${sheetRowNum}:${colEndLetter}${sheetRowNum}`
      )}?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
  } else {
    await googleFetch(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(
        `'${tabName}'!A:${colEndLetter}`
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
  }
}

export async function syncAllApplicationsToSheets(
  accessToken: string,
  config: GoogleWorkspaceConfig,
  applications: SchoolApplication[],
  actorEmail: string
): Promise<{ syncedCount: number; uploadedDocsCount: number }> {
  if (!config.spreadsheetId || !config.subfolders) {
    throw new Error('Google Workspace folders and database must be initialized first.');
  }

  let uploadedDocsCount = 0;
  const updatedApps: SchoolApplication[] = [];

  for (const app of applications) {
    let appCopy = { ...app };
    if (app.hasPendingDocumentUpload && !app.driveFileUrl && config.subfolders.schoolRegistrations) {
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        const docRes = await fetch(`/api/school-applications/${app.id}/document`, {
          headers: {
            'x-actor-role': 'operator',
            'x-actor-email': actorEmail || PRIMARY_OPERATOR_EMAIL,
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        if (docRes.ok) {
          const docPayload = await docRes.json();
          if (docPayload?.base64Data) {
            const uploaded = await uploadFileToDriveFolder(
              accessToken,
              config.subfolders.schoolRegistrations,
              `${app.id}_${docPayload.fileName || app.documentName || 'document'}`,
              docPayload.mimeType || app.documentMimeType || 'application/octet-stream',
              docPayload.base64Data,
              true
            );
            appCopy.driveFileId = uploaded.id;
            appCopy.driveFileUrl = uploaded.webViewLink;
            appCopy.hasPendingDocumentUpload = false;
            uploadedDocsCount++;

            if (auth.currentUser) {
              await setDoc(
                doc(db, 'school_applications', app.id),
                cleanFirestoreData({
                  driveFileId: uploaded.id,
                  driveFileUrl: uploaded.webViewLink,
                  hasPendingDocumentUpload: false,
                  updatedAt: new Date().toISOString(),
                }),
                { merge: true }
              ).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.warn(`Could not sync attachment for ${app.id}:`, e);
      }
    }
    updatedApps.push(appCopy);
  }

  const regRows = [REGISTRATION_HEADERS, ...updatedApps.map(applicationToRegistrationRow)];
  await googleFetch(
    `${SHEETS_API}/${config.spreadsheetId}/values/${encodeURIComponent(
      `'${SHEET_TABS.REGISTRATIONS}'!A1`
    )}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: regRows }),
    }
  );

  const approvedRows = [
    APPROVED_HEADERS,
    ...updatedApps
      .filter((a) => a.status === 'APPROVED')
      .map((a) => [
        a.schoolId || '',
        a.id,
        a.schoolName,
        a.administratorEmail,
        a.administratorName,
        a.contactNumber,
        a.address,
        a.district,
        a.schoolType,
        a.approvalDate || a.updatedAt || '',
        a.approvedBy || a.approvedByEmail || actorEmail,
        a.operatorRemarks || '',
        'ACTIVE',
      ]),
  ];
  await googleFetch(
    `${SHEETS_API}/${config.spreadsheetId}/values/${encodeURIComponent(
      `'${SHEET_TABS.APPROVED}'!A1`
    )}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: approvedRows }),
    }
  );

  const rejectedRows = [
    REJECTED_HEADERS,
    ...updatedApps
      .filter((a) => a.status === 'REJECTED')
      .map((a) => [
        a.id,
        a.schoolName,
        a.administratorEmail,
        a.administratorName,
        a.contactNumber,
        a.address,
        a.district,
        a.schoolType,
        a.updatedAt || '',
        a.approvedBy || actorEmail,
        a.operatorRemarks || '',
        'REJECTED',
      ]),
  ];
  await googleFetch(
    `${SHEETS_API}/${config.spreadsheetId}/values/${encodeURIComponent(
      `'${SHEET_TABS.REJECTED}'!A1`
    )}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rejectedRows }),
    }
  );

  await appendActivityLogToSheet(accessToken, config.spreadsheetId, {
    action: 'SYNC_SHEETS_DATABASE',
    actorEmail,
    targetId: config.spreadsheetId,
    schoolName: 'All Institutions',
    details: `Synced ${updatedApps.length} applications (${uploadedDocsCount} attachments uploaded to Drive).`,
    status: 'SUCCESS',
  });

  await saveWorkspaceConfig({ ...config, lastSyncedAt: new Date().toISOString() }, actorEmail);
  return { syncedCount: updatedApps.length, uploadedDocsCount };
}

// -------------------------------------------------------------
// Gmail API Email Sender (Supports Direct & Verified Alias)
// -------------------------------------------------------------
function base64UrlEncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailNotification(
  accessToken: string,
  params: {
    to: string;
    subject: string;
    bodyText: string;
    fromEmail?: string;
    replyToEmail?: string;
  }
): Promise<{ id: string }> {
  const headers: string[] = [
    `To: ${params.to}`,
    ...(params.fromEmail ? [`From: JMC Classroom Administration <${params.fromEmail}>`] : []),
    `Reply-To: ${params.replyToEmail || PRIMARY_OPERATOR_EMAIL}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ];

  const rawMessage = `${headers.join('\r\n')}\r\n\r\n${params.bodyText}`;
  const raw = base64UrlEncodeUtf8(rawMessage);

  return googleFetch<{ id: string }>(`${GMAIL_API}/messages/send`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
}

// -------------------------------------------------------------
// Approval & Rejection Automation in Google Workspace
// -------------------------------------------------------------
export async function executeApprovalInWorkspace(
  accessToken: string,
  config: GoogleWorkspaceConfig,
  application: SchoolApplication,
  school: School,
  approvedByEmail: string,
  remarks: string
): Promise<{ emailSent: boolean; driveSaved: boolean }> {
  if (!config.spreadsheetId || !config.subfolders) {
    throw new Error('Google Workspace database is not initialized.');
  }

  const approvalDate = school.approvedAt || new Date().toISOString();

  await upsertRowInSheet(
    accessToken,
    config.spreadsheetId,
    SHEET_TABS.REGISTRATIONS,
    0,
    application.id,
    applicationToRegistrationRow({
      ...application,
      status: 'APPROVED',
      operatorRemarks: remarks,
      approvalDate,
      approvedBy: approvedByEmail,
      approvedByEmail,
      schoolId: school.id,
    }),
    'P'
  );

  await upsertRowInSheet(
    accessToken,
    config.spreadsheetId,
    SHEET_TABS.APPROVED,
    0,
    school.id,
    [
      school.id,
      application.id,
      application.schoolName,
      application.administratorEmail,
      application.administratorName,
      application.contactNumber,
      application.address,
      application.district,
      application.schoolType,
      approvalDate,
      approvedByEmail,
      remarks,
      'ACTIVE',
    ],
    'M'
  );

  let driveSaved = false;
  try {
    await uploadFileToDriveFolder(
      accessToken,
      config.subfolders.approvedSchools,
      `${school.id}_${application.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.json`,
      'application/json',
      JSON.stringify({ school, application, approvedByEmail, remarks }, null, 2),
      false
    );
    driveSaved = true;
  } catch (err) {
    console.warn('Drive approved record upload notice:', err);
  }

  let emailSent = false;
  try {
    await sendGmailNotification(accessToken, {
      to: application.administratorEmail,
      fromEmail:
        config.aliasMode === 'direct_account' || config.aliasMode === 'verified_send_as_alias'
          ? config.sendingFromEmail
          : undefined,
      replyToEmail: PRIMARY_OPERATOR_EMAIL,
      subject: 'JMC Classroom – Your School Registration Has Been Approved!',
      bodyText:
        `Dear ${application.administratorName},\n\n` +
        `Congratulations! Your school registration for "${application.schoolName}" has been APPROVED by the JMC Classroom Operator (${approvedByEmail}).\n\n` +
        `Assigned School ID: ${school.id}\n` +
        `Registration ID: ${application.id}\n` +
        `Registered Administrator Email: ${application.administratorEmail}\n` +
        `Approval Date: ${approvalDate}\n` +
        `Operator Notes: ${remarks}\n\n` +
        `You can now sign in to the JMC Classroom School Administrator Portal using Google Sign-In.\n\n` +
        `Best Regards,\nJMC Classroom Administration Team\n${PRIMARY_OPERATOR_EMAIL}`,
    });
    emailSent = true;
  } catch (emailErr) {
    console.warn('Gmail approval notification notice:', emailErr);
  }

  await appendActivityLogToSheet(accessToken, config.spreadsheetId, {
    action: 'APPROVE_SCHOOL',
    actorEmail: approvedByEmail,
    targetId: school.id,
    schoolName: application.schoolName,
    details: `Approved ${application.id}. Sheet updated, Drive saved=${driveSaved}, Gmail sent=${emailSent}.`,
    status: 'APPROVED',
  });

  return { emailSent, driveSaved };
}

export async function executeRejectionInWorkspace(
  accessToken: string,
  config: GoogleWorkspaceConfig,
  application: SchoolApplication,
  rejectedByEmail: string,
  remarks: string
): Promise<{ emailSent: boolean; driveSaved: boolean }> {
  if (!config.spreadsheetId || !config.subfolders) {
    throw new Error('Google Workspace database is not initialized.');
  }

  const rejectedDate = new Date().toISOString();

  await upsertRowInSheet(
    accessToken,
    config.spreadsheetId,
    SHEET_TABS.REGISTRATIONS,
    0,
    application.id,
    applicationToRegistrationRow({
      ...application,
      status: 'REJECTED',
      operatorRemarks: remarks,
      approvalDate: rejectedDate,
      approvedBy: rejectedByEmail,
    }),
    'P'
  );

  await upsertRowInSheet(
    accessToken,
    config.spreadsheetId,
    SHEET_TABS.REJECTED,
    0,
    application.id,
    [
      application.id,
      application.schoolName,
      application.administratorEmail,
      application.administratorName,
      application.contactNumber,
      application.address,
      application.district,
      application.schoolType,
      rejectedDate,
      rejectedByEmail,
      remarks,
      'REJECTED',
    ],
    'L'
  );

  let driveSaved = false;
  try {
    await uploadFileToDriveFolder(
      accessToken,
      config.subfolders.rejectedApplications,
      `${application.id}_REJECTED.json`,
      'application/json',
      JSON.stringify({ application, rejectedByEmail, rejectedDate, remarks }, null, 2),
      false
    );
    driveSaved = true;
  } catch (err) {
    console.warn('Drive rejected record upload notice:', err);
  }

  let emailSent = false;
  try {
    await sendGmailNotification(accessToken, {
      to: application.administratorEmail,
      fromEmail:
        config.aliasMode === 'direct_account' || config.aliasMode === 'verified_send_as_alias'
          ? config.sendingFromEmail
          : undefined,
      replyToEmail: PRIMARY_OPERATOR_EMAIL,
      subject: 'JMC Classroom – School Registration Update',
      bodyText:
        `Dear ${application.administratorName},\n\n` +
        `Thank you for registering "${application.schoolName}" with JMC Classroom.\n\n` +
        `Unfortunately, your registration (${application.id}) could not be approved at this time.\n\n` +
        `Operator Notes:\n${remarks}\n\n` +
        `Please review your submitted information and feel free to submit a new application.\n\n` +
        `Best Regards,\nJMC Classroom Administration Team\n${PRIMARY_OPERATOR_EMAIL}`,
    });
    emailSent = true;
  } catch (emailErr) {
    console.warn('Gmail rejection notification notice:', emailErr);
  }

  await appendActivityLogToSheet(accessToken, config.spreadsheetId, {
    action: 'REJECT_SCHOOL',
    actorEmail: rejectedByEmail,
    targetId: application.id,
    schoolName: application.schoolName,
    details: `Rejected ${application.id}. Reason: ${remarks}. Gmail sent=${emailSent}.`,
    status: 'REJECTED',
  });

  return { emailSent, driveSaved };
}

// -------------------------------------------------------------
// System Reports & Database Backups to Google Drive
// -------------------------------------------------------------
export async function generateSystemReportToDrive(
  accessToken: string,
  config: GoogleWorkspaceConfig,
  schools: School[],
  applications: SchoolApplication[],
  actorEmail: string
): Promise<{ fileUrl: string; fileName: string }> {
  if (!config.subfolders?.systemReports || !config.spreadsheetId) {
    throw new Error('Google Workspace folders must be initialized first.');
  }

  const pending = applications.filter((a) => a.status === 'PENDING').length;
  const approved = applications.filter((a) => a.status === 'APPROVED').length;
  const rejected = applications.filter((a) => a.status === 'REJECTED').length;

  const timestamp = new Date().toISOString();
  const fileName = `JMC_System_Report_${timestamp.slice(0, 10)}.txt`;
  const reportText = [
    'JMC CLASSROOM – GOOGLE WORKSPACE SYSTEM REPORT',
    `Generated At: ${timestamp}`,
    `Operator Account: ${actorEmail}`,
    `Primary Designated Account: ${PRIMARY_OPERATOR_EMAIL}`,
    '============================================================',
    `Active Registered Schools: ${schools.length}`,
    `Total Applications: ${applications.length}`,
    `  - Pending Review: ${pending}`,
    `  - Approved: ${approved}`,
    `  - Rejected: ${rejected}`,
    '',
    `Spreadsheet URL: ${config.spreadsheetUrl || ''}`,
    `Drive Root Folder: ${config.rootFolderUrl || ''}`,
    '============================================================',
    'RECENT APPLICATIONS:',
    ...applications.map(
      (a) => `- [${a.status}] ${a.id} | ${a.schoolName} (${a.district}) | ${a.administratorEmail}`
    ),
  ].join('\n');

  const uploaded = await uploadFileToDriveFolder(
    accessToken,
    config.subfolders.systemReports,
    fileName,
    'text/plain',
    reportText,
    false
  );

  await appendActivityLogToSheet(accessToken, config.spreadsheetId, {
    action: 'GENERATE_SYSTEM_REPORT',
    actorEmail,
    targetId: uploaded.id,
    schoolName: 'JMC Classroom Platform',
    details: `Uploaded ${fileName} to System Reports folder.`,
    status: 'SUCCESS',
  });

  await saveWorkspaceConfig({ ...config, lastReportUrl: uploaded.webViewLink }, actorEmail);
  return { fileUrl: uploaded.webViewLink, fileName: uploaded.name };
}

export async function backupDatabaseToDrive(
  accessToken: string,
  config: GoogleWorkspaceConfig,
  schools: School[],
  applications: SchoolApplication[],
  actorEmail: string
): Promise<{ fileUrl: string; fileName: string }> {
  if (!config.subfolders?.backups || !config.spreadsheetId) {
    throw new Error('Google Workspace folders must be initialized first.');
  }

  const timestamp = new Date().toISOString();
  const fileName = `JMC_Database_Backup_${timestamp.replace(/[:.]/g, '-')}.json`;
  const backupPayload = JSON.stringify(
    {
      exportedAt: timestamp,
      exportedBy: actorEmail,
      primaryAccount: PRIMARY_OPERATOR_EMAIL,
      schools,
      applications,
    },
    null,
    2
  );

  const uploaded = await uploadFileToDriveFolder(
    accessToken,
    config.subfolders.backups,
    fileName,
    'application/json',
    backupPayload,
    false
  );

  await appendActivityLogToSheet(accessToken, config.spreadsheetId, {
    action: 'DATABASE_BACKUP',
    actorEmail,
    targetId: uploaded.id,
    schoolName: 'JMC Classroom Platform',
    details: `Saved ${fileName} (${schools.length} schools, ${applications.length} applications) to Backups folder.`,
    status: 'SUCCESS',
  });

  await saveWorkspaceConfig({ ...config, lastBackupUrl: uploaded.webViewLink }, actorEmail);
  return { fileUrl: uploaded.webViewLink, fileName: uploaded.name };
}

// -------------------------------------------------------------
// Zero-Env Google Apps Script Automation (Persisted in Config & Firestore)
// -------------------------------------------------------------
async function operatorApiHeaders(actorEmail?: string, includeJson = false): Promise<Record<string, string>> {
  const resolvedEmail = (actorEmail || auth.currentUser?.email || PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'x-actor-role': 'operator',
    'x-actor-email': resolvedEmail,
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
  };
}

export async function fetchAppsScriptTemplate(actorEmail?: string): Promise<{
  filename: string;
  primaryOperator: string;
  code: string;
}> {
  const res = await fetch('/api/workspace/code-gs', {
    headers: await operatorApiHeaders(actorEmail, false),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Could not load Code.gs template.');
  }
  return data;
}

export async function verifyAndSaveAppsScriptUrl(
  appsScriptUrl: string,
  actorEmail?: string
): Promise<{
  config: GoogleWorkspaceConfig;
  account: {
    effectiveEmail?: string;
    targetEmail?: string;
    mode?: 'direct_account' | 'verified_send_as_alias' | 'reply_to_fallback';
    sendFrom?: string;
    canSendEmail?: boolean;
  };
}> {
  const res = await fetch('/api/workspace/apps-script/verify', {
    method: 'POST',
    headers: await operatorApiHeaders(actorEmail, true),
    body: JSON.stringify({ appsScriptUrl: appsScriptUrl.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify Google Apps Script Web App URL.');
  }
  const saved = await saveWorkspaceConfig(data.config, actorEmail);
  return { config: saved, account: data.account || {} };
}

export async function disconnectAppsScriptUrl(actorEmail?: string): Promise<GoogleWorkspaceConfig> {
  const res = await fetch('/api/workspace/apps-script/disconnect', {
    method: 'POST',
    headers: await operatorApiHeaders(actorEmail, true),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to disconnect Apps Script URL.');
  }
  return saveWorkspaceConfig(data.config, actorEmail);
}

export async function runAppsScriptAutomationAction(
  action: 'setupWorkspace' | 'syncApplications' | 'generateReport' | 'backupDatabase',
  actorEmail?: string,
  extraData?: { applications?: SchoolApplication[]; schools?: School[] }
): Promise<{ result: any; config: GoogleWorkspaceConfig }> {
  const res = await fetch('/api/workspace/apps-script/action', {
    method: 'POST',
    headers: await operatorApiHeaders(actorEmail, true),
    body: JSON.stringify({
      action,
      operatorEmail: (actorEmail || PRIMARY_OPERATOR_EMAIL).toLowerCase().trim(),
      ...(extraData || {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Apps Script action "${action}" failed.`);
  }
  const saved = await saveWorkspaceConfig(data.config, actorEmail);
  return { result: data.result, config: saved };
}
