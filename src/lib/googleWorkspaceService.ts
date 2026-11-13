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
function sanitizeWorkspaceConfigForCurrentOperator(
  raw: Partial<GoogleWorkspaceConfig> | null | undefined
): GoogleWorkspaceConfig {
  const targetEmail = PRIMARY_OPERATOR_EMAIL.toLowerCase().trim();
  const storedPrimary = String(raw?.primaryAccountEmail || '').toLowerCase().trim();
  const storedConnected = String(raw?.connectedGoogleEmail || '').toLowerCase().trim();

  if (!raw || storedPrimary !== targetEmail || storedConnected === 'info@jmcinnovator.cc.cd') {
    return {
      configured: false,
      primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
    };
  }

  return {
    ...raw,
    configured: Boolean(raw.configured && raw.rootFolderId && raw.spreadsheetId),
    primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
  };
}

export async function fetchWorkspaceConfig(actorEmail?: string): Promise<GoogleWorkspaceConfig> {
  const resolvedEmail = (actorEmail || auth.currentUser?.email || PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;

  if (auth.currentUser) {
    try {
      const snap = await getDoc(doc(db, 'system_config', 'google_workspace'));
      if (snap.exists()) {
        const data = snap.data() as Partial<GoogleWorkspaceConfig>;
        return sanitizeWorkspaceConfigForCurrentOperator(data);
      }
    } catch (err) {
      console.warn('Firestore workspace config read notice:', err);
    }
  }

  try {
    const res = await fetch('/api/workspace/config', {
      headers: {
        'x-actor-role': 'operator',
        'x-actor-email': resolvedEmail,
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
    });
    if (res.ok) {
      const apiCfg = await res.json();
      return sanitizeWorkspaceConfigForCurrentOperator(apiCfg);
    }
  } catch {}

  return {
    configured: false,
    primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
  };
}

export async function saveWorkspaceConfig(
  config: GoogleWorkspaceConfig,
  actorEmail?: string
): Promise<GoogleWorkspaceConfig> {
  const resolvedEmail = (actorEmail || auth.currentUser?.email || PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const cleanCopy: Record<string, any> = { ...config };
  delete cleanCopy.accessToken;
  delete cleanCopy.token;
  delete cleanCopy.refreshToken;
  delete cleanCopy.idToken;

  const payload: GoogleWorkspaceConfig = {
    ...(cleanCopy as GoogleWorkspaceConfig),
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
// Account, Alias & Live API Verification (innovatorsjmc@gmail.com)
// -------------------------------------------------------------
export async function verifyWorkspaceAccountAndAliases(
  accessToken: string,
  spreadsheetId?: string
): Promise<WorkspaceVerificationResult> {
  const targetEmail = PRIMARY_OPERATOR_EMAIL.toLowerCase();
  const testedAt = new Date().toISOString();

  let connectedEmail = '';
  let driveApiOk = false;
  let sheetsApiOk = false;
  let gmailApiOk = false;
  let availableSendAsAliases: WorkspaceVerificationResult['availableSendAsAliases'] = [];
  const apiErrors: WorkspaceVerificationResult['apiErrors'] = {};

  // 1. Live Google Drive API Check (about + files list)
  try {
    const driveAbout = await googleFetch<any>(`${DRIVE_API}/about?fields=user`, accessToken);
    connectedEmail = String(driveAbout?.user?.emailAddress || '').toLowerCase().trim();
    await googleFetch<any>(`${DRIVE_API}/files?pageSize=1&fields=files(id)&spaces=drive`, accessToken);
    driveApiOk = true;
  } catch (err: any) {
    apiErrors.drive = err?.message || 'Drive API check failed.';
  }

  // 2. Live Google Sheets API Check
  try {
    const targetSheetUrl = spreadsheetId
      ? `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title`
      : `${SHEETS_API}/_jmc_api_probe_check?fields=spreadsheetId`;
    const sheetRes = await fetch(targetSheetUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (sheetRes.ok || (!spreadsheetId && sheetRes.status === 404)) {
      sheetsApiOk = true;
    } else {
      const errBody = await sheetRes.json().catch(() => ({}));
      apiErrors.sheets =
        errBody?.error?.message || `Sheets API verification failed (${sheetRes.status})`;
    }
  } catch (err: any) {
    apiErrors.sheets = err?.message || 'Sheets API network check failed.';
  }

  // 3. Live Gmail API Check
  try {
    const gmailProfile = await googleFetch<any>(`${GMAIL_API}/profile`, accessToken);
    if (!connectedEmail) {
      connectedEmail = String(gmailProfile?.emailAddress || '').toLowerCase().trim();
    }
    gmailApiOk = Boolean(gmailProfile?.emailAddress);
  } catch (err: any) {
    apiErrors.gmail = err?.message || 'Gmail API check failed.';
  }

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

  const accountMatchesPrimary = Boolean(connectedEmail && connectedEmail === targetEmail);
  const canAuthorizeDriveAndSheets = driveApiOk && sheetsApiOk;
  const canSendEmail = gmailApiOk;

  let aliasMode: WorkspaceVerificationResult['aliasMode'] = 'reply_to_fallback';
  let recommendedSendAsEmail = connectedEmail || targetEmail;
  let message = '';

  const matchingAlias = availableSendAsAliases.find(
    (a) => a.sendAsEmail === targetEmail && a.verificationStatus === 'accepted'
  );

  if (accountMatchesPrimary) {
    aliasMode = 'direct_account';
    recommendedSendAsEmail = targetEmail;
  } else if (matchingAlias) {
    aliasMode = 'verified_send_as_alias';
    recommendedSendAsEmail = targetEmail;
  } else {
    aliasMode = 'reply_to_fallback';
    recommendedSendAsEmail = connectedEmail || targetEmail;
  }

  const failedApis: string[] = [];
  if (!driveApiOk) failedApis.push(`Drive (${apiErrors.drive || 'error'})`);
  if (!sheetsApiOk) failedApis.push(`Sheets (${apiErrors.sheets || 'error'})`);
  if (!gmailApiOk) failedApis.push(`Gmail (${apiErrors.gmail || 'error'})`);

  if (failedApis.length > 0) {
    message = `Authorized as ${connectedEmail || 'unknown account'}, but live API test(s) failed: ${failedApis.join('; ')}.`;
  } else if (accountMatchesPrimary) {
    message = `Live API tests passed for primary operator account ${targetEmail} (Drive, Sheets, and Gmail verified).`;
  } else if (matchingAlias) {
    message = `Live API tests passed for ${connectedEmail} with verified Send-As alias ${targetEmail}. Recommended: authorize directly with ${targetEmail}.`;
  } else {
    message = `Authorized Google account (${connectedEmail || 'unknown'}) does not match primary operator account (${targetEmail}). Sign in with ${targetEmail} for direct ownership and sending.`;
  }

  return {
    connectedEmail,
    targetAccountEmail: targetEmail,
    accountMatchesPrimary,
    driveApiOk,
    sheetsApiOk,
    gmailApiOk,
    canAuthorizeDriveAndSheets,
    canSendEmail,
    aliasMode,
    recommendedSendAsEmail,
    availableSendAsAliases,
    ...(Object.keys(apiErrors).length > 0 ? { apiErrors } : {}),
    testedAt,
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
  const sanitizedExisting = sanitizeWorkspaceConfigForCurrentOperator(existingConfig);
  const verification = await verifyWorkspaceAccountAndAliases(accessToken, sanitizedExisting.spreadsheetId);

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
    sanitizedExisting.spreadsheetId
  );

  await appendActivityLogToSheet(accessToken, spreadsheetId, {
    action: 'WORKSPACE_PROVISIONED',
    actorEmail: verification.connectedEmail || actorEmail || PRIMARY_OPERATOR_EMAIL,
    targetId: spreadsheetId,
    schoolName: 'JMC Classroom Platform',
    details: `Verified Drive root "${WORKSPACE_ROOT_FOLDER_NAME}" (5 subfolders) and 4-sheet Database (${verification.aliasMode}).`,
    status: 'SUCCESS',
  });

  const postProvisionVerify = await verifyWorkspaceAccountAndAliases(accessToken, spreadsheetId);

  const config: GoogleWorkspaceConfig = {
    configured: true,
    primaryAccountEmail: PRIMARY_OPERATOR_EMAIL,
    connectedGoogleEmail: postProvisionVerify.connectedEmail,
    sendingFromEmail: postProvisionVerify.recommendedSendAsEmail,
    aliasMode: postProvisionVerify.aliasMode,
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
    apiVerified: postProvisionVerify.driveApiOk && postProvisionVerify.sheetsApiOk && postProvisionVerify.gmailApiOk,
    lastTestedAt: postProvisionVerify.testedAt,
    lastSyncedAt: new Date().toISOString(),
  };

  await saveWorkspaceConfig(config, postProvisionVerify.connectedEmail || actorEmail);
  return { config, verification: postProvisionVerify };
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

export async function sendTestEmailNotification(
  accessToken: string,
  config?: GoogleWorkspaceConfig
): Promise<{ id: string; sentTo: string; sentAt: string }> {
  const sentAt = new Date().toISOString();
  const res = await sendGmailNotification(accessToken, {
    to: PRIMARY_OPERATOR_EMAIL,
    fromEmail:
      config?.aliasMode === 'direct_account' || config?.aliasMode === 'verified_send_as_alias'
        ? config?.sendingFromEmail || PRIMARY_OPERATOR_EMAIL
        : undefined,
    replyToEmail: PRIMARY_OPERATOR_EMAIL,
    subject: 'JMC Classroom – Live Gmail API Verification Test',
    bodyText:
      `This is an automated live Gmail API test dispatched from JMC Classroom Operator Dashboard.\n\n` +
      `Primary Designated Operator: ${PRIMARY_OPERATOR_EMAIL}\n` +
      `Tested At: ${sentAt}\n\n` +
      `Drive, Sheets, and Gmail automation notifications are configured for ${PRIMARY_OPERATOR_EMAIL}.\n`,
  });

  return {
    id: res.id,
    sentTo: PRIMARY_OPERATOR_EMAIL,
    sentAt,
  };
}

export async function sendRegistrationNotificationToOperator(
  accessToken: string,
  config: GoogleWorkspaceConfig | undefined,
  application: SchoolApplication
): Promise<{ id: string }> {
  return sendGmailNotification(accessToken, {
    to: PRIMARY_OPERATOR_EMAIL,
    fromEmail:
      config?.aliasMode === 'direct_account' || config?.aliasMode === 'verified_send_as_alias'
        ? config?.sendingFromEmail || PRIMARY_OPERATOR_EMAIL
        : undefined,
    replyToEmail: PRIMARY_OPERATOR_EMAIL,
    subject: `JMC Classroom – New School Registration: ${application.schoolName} (${application.id})`,
    bodyText:
      `A new school registration requires operator review.\n\n` +
      `Registration ID: ${application.id}\n` +
      `School Name: ${application.schoolName}\n` +
      `Official School Email: ${application.administratorEmail}\n` +
      `Contact Person: ${application.administratorName}\n` +
      `Phone Number: ${application.contactNumber}\n` +
      `District: ${application.district}, ${application.province}\n` +
      `Address: ${application.address}\n` +
      `School Type: ${application.schoolType}\n` +
      `Submitted: ${application.submissionDate}\n\n` +
      `Best Regards,\nJMC Classroom Administration Team\n${PRIMARY_OPERATOR_EMAIL}`,
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
