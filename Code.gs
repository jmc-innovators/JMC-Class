/**
 * ============================================================================
 * JMC CLASSROOM – GOOGLE WORKSPACE AUTOMATION SYSTEM (Code.gs)
 * Google Drive + Google Sheets Database + Gmail / Alias Verification +
 * Firestore Integration
 * ============================================================================
 *
 * PRIMARY OPERATOR & WORKSPACE ACCOUNT:
 *   info@jmcinnovator.cc.cd
 *
 * SETUP INSTRUCTIONS:
 * 1. Sign in to Google as the account that owns Drive/Sheets and can send as
 *    `info@jmcinnovator.cc.cd` (either directly or as a verified Send-As alias).
 * 2. Create a new Google Apps Script project at https://script.google.com
 *    (or from a bound Google Sheet: Extensions > Apps Script).
 * 3. Paste this entire file into Code.gs.
 * 4. Enable the Advanced Gmail Service if you want `sendAs` alias inspection:
 *    Services (+) > Gmail API (identifier: Gmail). (Optional — GmailApp fallback
 *    also works automatically.)
 * 5. Run `setupAutomationWorkspace()` once from the Apps Script Editor to:
 *      - Verify account authorization & sending alias for info@jmcinnovator.cc.cd
 *      - Create Drive folder `JMC CLASSROOM AUTOMATION` & all 5 subfolders
 *      - Create Spreadsheet `JMC Classroom – School Registration Database`
 *        with all 4 sheets (`School Registrations`, `Approved Schools`,
 *        `Rejected Schools`, `Activity Logs`)
 * 6. Deploy > New deployment > Web app:
 *      - Execute as: Me (info@jmcinnovator.cc.cd)
 *      - Who has access: Anyone
 * 7. Paste the Web App URL directly into the JMC Classroom Operator Dashboard
 *    (Google Workspace Automation tab). No `.env` or environment variables needed.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
var CONFIG = {
  PRIMARY_OPERATOR_EMAIL: 'info@jmcinnovator.cc.cd',
  AUTHORIZED_OPERATORS: [
    'info@jmcinnovator.cc.cd',
    'jmc.class2027@gmail.com'
  ],
  ROOT_FOLDER_NAME: 'JMC CLASSROOM AUTOMATION',
  SUBFOLDERS: {
    REGISTRATIONS: 'School Registrations',
    APPROVED: 'Approved Schools',
    REJECTED: 'Rejected Applications',
    REPORTS: 'System Reports',
    BACKUPS: 'Backups'
  },
  SPREADSHEET_NAME: 'JMC Classroom – School Registration Database',
  SHEETS: {
    REGISTRATIONS: 'School Registrations',
    APPROVED: 'Approved Schools',
    REJECTED: 'Rejected Schools',
    LOGS: 'Activity Logs'
  },
  SENDER_NAME: 'JMC Classroom Administration Team',
  PLATFORM_NAME: 'JMC Classroom',
  PLATFORM_URL: 'https://jmcinnovator.cc.cd/',
  // Optional: set Firestore REST target if pushing directly from Apps Script
  FIREBASE_PROJECT_ID: 'gen-lang-client-0883116641',
  FIRESTORE_DATABASE_ID: 'ai-studio-jmcclass-20742766-c8cd-4030-95f3-22ca7c7d152d'
};

var REGISTRATION_HEADERS = [
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
  'School ID'
];

var APPROVED_HEADERS = [
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
  'Status'
];

var REJECTED_HEADERS = [
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
  'Status'
];

var ACTIVITY_LOG_HEADERS = [
  'Timestamp',
  'Action',
  'Actor Email',
  'Target ID',
  'School Name',
  'Details',
  'Status'
];

// ============================================================================
// ONE-CLICK SETUP & ACCOUNT / ALIAS VERIFICATION
// ============================================================================
function setupAutomationWorkspace() {
  var accountCheck = verifyAuthorizedAccount_();
  var folders = ensureAutomationFolders_();
  var db = getOrCreateDatabase_(folders.rootFolder);

  logActivity_(
    'WORKSPACE_SETUP',
    accountCheck.effectiveEmail,
    db.spreadsheet.getId(),
    CONFIG.PLATFORM_NAME,
    'Provisioned Drive folders, 4-tab Sheets database, and verified sending configuration (' + accountCheck.mode + ').',
    'SUCCESS'
  );

  return {
    success: true,
    account: accountCheck,
    rootFolderId: folders.rootFolder.getId(),
    rootFolderUrl: folders.rootFolder.getUrl(),
    subfolders: {
      schoolRegistrations: folders.registrations.getId(),
      approvedSchools: folders.approved.getId(),
      rejectedApplications: folders.rejected.getId(),
      systemReports: folders.reports.getId(),
      backups: folders.backups.getId()
    },
    spreadsheetId: db.spreadsheet.getId(),
    spreadsheetUrl: db.spreadsheet.getUrl()
  };
}

/**
 * Verifies the executing Google account and checks whether info@jmcinnovator.cc.cd
 * is the primary account or a configured Gmail/Domain sending alias.
 */
function verifyAuthorizedAccount_() {
  var effectiveEmail = '';
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').toLowerCase().trim();
  } catch (e) {}

  var aliases = [];
  try {
    aliases = GmailApp.getAliases() || [];
  } catch (e) {}

  var lowerAliases = aliases.map(function (a) {
    return String(a || '').toLowerCase().trim();
  });

  var target = CONFIG.PRIMARY_OPERATOR_EMAIL.toLowerCase();
  var mode = 'reply_to_fallback';
  var sendFrom = effectiveEmail;

  if (effectiveEmail === target) {
    mode = 'direct_account';
    sendFrom = target;
  } else if (lowerAliases.indexOf(target) !== -1) {
    mode = 'verified_send_as_alias';
    sendFrom = target;
  }

  return {
    effectiveEmail: effectiveEmail,
    targetEmail: target,
    aliases: aliases,
    mode: mode,
    sendFrom: sendFrom,
    canSendEmail: Boolean(effectiveEmail)
  };
}

// ============================================================================
// 1. GOOGLE DRIVE AUTOMATION (DEDUPLICATED)
// ============================================================================
function getOrCreateFolder_(parentFolder, folderName) {
  var iterator = parentFolder
    ? parentFolder.getFoldersByName(folderName)
    : DriveApp.getFoldersByName(folderName);

  while (iterator.hasNext()) {
    var existing = iterator.next();
    if (!existing.isTrashed()) {
      return existing;
    }
  }
  return parentFolder ? parentFolder.createFolder(folderName) : DriveApp.createFolder(folderName);
}

function ensureAutomationFolders_() {
  var props = PropertiesService.getScriptProperties();
  var rootFolder = null;
  var savedRootId = props.getProperty('JMC_ROOT_FOLDER_ID');

  if (savedRootId) {
    try {
      var candidate = DriveApp.getFolderById(savedRootId);
      if (candidate && !candidate.isTrashed()) {
        rootFolder = candidate;
      }
    } catch (e) {}
  }

  if (!rootFolder) {
    rootFolder = getOrCreateFolder_(null, CONFIG.ROOT_FOLDER_NAME);
    props.setProperty('JMC_ROOT_FOLDER_ID', rootFolder.getId());
  }

  var registrations = getOrCreateFolder_(rootFolder, CONFIG.SUBFOLDERS.REGISTRATIONS);
  var approved = getOrCreateFolder_(rootFolder, CONFIG.SUBFOLDERS.APPROVED);
  var rejected = getOrCreateFolder_(rootFolder, CONFIG.SUBFOLDERS.REJECTED);
  var reports = getOrCreateFolder_(rootFolder, CONFIG.SUBFOLDERS.REPORTS);
  var backups = getOrCreateFolder_(rootFolder, CONFIG.SUBFOLDERS.BACKUPS);

  return {
    rootFolder: rootFolder,
    registrations: registrations,
    approved: approved,
    rejected: rejected,
    reports: reports,
    backups: backups
  };
}

function uploadRegistrationDocument_(registrationId, schoolName, docPayload) {
  if (!docPayload || !docPayload.base64Data || !docPayload.fileName) {
    return null;
  }
  var folders = ensureAutomationFolders_();
  var bytes = Utilities.base64Decode(docPayload.base64Data);
  var mimeType = docPayload.mimeType || 'application/octet-stream';
  var safeName = registrationId + '_' + String(docPayload.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  var blob = Utilities.newBlob(bytes, mimeType, safeName);
  var file = folders.registrations.createFile(blob);
  file.setDescription('Supporting document for ' + schoolName + ' (' + registrationId + ')');
  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    fileName: file.getName()
  };
}

// ============================================================================
// 2. GOOGLE SHEETS DATABASE (DEDUPLICATED, 4 STRUCTURED TABS)
// ============================================================================
function ensureSheetWithHeaders_(ss, title, headers, headerBg) {
  var sheet = ss.getSheetByName(title);
  if (!sheet) {
    sheet = ss.insertSheet(title);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold');
    range.setBackground(headerBg || '#1e293b');
    range.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  return sheet;
}

function getOrCreateDatabase_(rootFolder) {
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  var savedId = props.getProperty('JMC_SPREADSHEET_ID');

  if (savedId) {
    try {
      ss = SpreadsheetApp.openById(savedId);
    } catch (e) {}
  }

  if (!ss) {
    var folders = rootFolder ? { rootFolder: rootFolder } : ensureAutomationFolders_();
    var files = folders.rootFolder.getFilesByName(CONFIG.SPREADSHEET_NAME);
    while (files.hasNext()) {
      var file = files.next();
      if (!file.isTrashed() && file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        ss = SpreadsheetApp.openById(file.getId());
        break;
      }
    }
    if (!ss) {
      var active = null;
      try {
        active = SpreadsheetApp.getActiveSpreadsheet();
      } catch (e) {}
      if (active && active.getName() === CONFIG.SPREADSHEET_NAME) {
        ss = active;
      } else {
        ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
        try {
          var createdFile = DriveApp.getFileById(ss.getId());
          createdFile.moveTo(folders.rootFolder);
        } catch (moveErr) {}
      }
    }
    props.setProperty('JMC_SPREADSHEET_ID', ss.getId());
  }

  var regSheet = ensureSheetWithHeaders_(ss, CONFIG.SHEETS.REGISTRATIONS, REGISTRATION_HEADERS, '#1e293b');
  var appSheet = ensureSheetWithHeaders_(ss, CONFIG.SHEETS.APPROVED, APPROVED_HEADERS, '#065f46');
  var rejSheet = ensureSheetWithHeaders_(ss, CONFIG.SHEETS.REJECTED, REJECTED_HEADERS, '#9f1239');
  var logSheet = ensureSheetWithHeaders_(ss, CONFIG.SHEETS.LOGS, ACTIVITY_LOG_HEADERS, '#312e81');

  // Remove default empty Sheet1 if untouched
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }

  return {
    spreadsheet: ss,
    registrations: regSheet,
    approved: appSheet,
    rejected: rejSheet,
    logs: logSheet
  };
}

function logActivity_(action, actorEmail, targetId, schoolName, details, status) {
  try {
    var db = getOrCreateDatabase_();
    db.logs.appendRow([
      new Date().toISOString(),
      action,
      actorEmail || CONFIG.PRIMARY_OPERATOR_EMAIL,
      targetId || '',
      schoolName || '',
      details || '',
      status || 'INFO'
    ]);
  } catch (e) {
    Logger.log('Activity log warning: ' + e.message);
  }
}

// ============================================================================
// HTTP ENDPOINTS (doGet / doPost)
// ============================================================================
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'ping';

    if (action === 'getApplications') {
      return handleGetApplications_(params);
    }
    if (action === 'verifyAccount') {
      return createJsonResponse_({ success: true, account: verifyAuthorizedAccount_() });
    }
    if (action === 'setupWorkspace') {
      return createJsonResponse_(setupAutomationWorkspace());
    }

    return createJsonResponse_({
      success: true,
      service: 'JMC Classroom – Google Workspace Automation API',
      primaryOperator: CONFIG.PRIMARY_OPERATOR_EMAIL,
      status: 'online',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse_({ success: false, error: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var data;
    try {
      data = JSON.parse(rawBody);
    } catch (parseErr) {
      data = e && e.parameter ? e.parameter : {};
    }

    var action = data.action || (e && e.parameter ? e.parameter.action : '');

    switch (action) {
      case 'setupWorkspace':
        return createJsonResponse_(setupAutomationWorkspace());
      case 'verifyAccount':
        return createJsonResponse_({ success: true, account: verifyAuthorizedAccount_() });
      case 'syncApplications':
        return handleSyncApplications_(data);
      case 'register':
      case 'submitApplication':
        return handleRegisterSchool_(data);
      case 'getApplications':
        return handleGetApplications_(data);
      case 'approveApplication':
        return handleApproveApplication_(data);
      case 'rejectApplication':
        return handleRejectApplication_(data);
      case 'generateReport':
        return createJsonResponse_(generateSystemReport());
      case 'backupDatabase':
        return createJsonResponse_(createDatabaseBackup());
      default:
        return createJsonResponse_({
          success: false,
          error: 'Unsupported action: ' + action
        });
    }
  } catch (err) {
    return createJsonResponse_({ success: false, error: err.message || String(err) });
  }
}

// ============================================================================
// 3. SCHOOL REGISTRATION HANDLER
// ============================================================================
function handleRegisterSchool_(data) {
  var schoolName = String(data.schoolName || '').trim();
  var schoolEmail = String(data.administratorEmail || data.schoolEmail || '').trim().toLowerCase();
  var contactPerson = String(data.administratorName || data.contactPerson || '').trim();
  var phone = String(data.contactNumber || data.phone || '').trim();
  var address = String(data.address || '').trim();
  var district = String(data.district || '').trim();
  var schoolType = String(data.schoolType || '').trim();
  var additionalInfo = String(data.additionalInfo || '').trim();

  if (!schoolName || !schoolEmail || !contactPerson || !phone || !address || !district || !schoolType) {
    return createJsonResponse_({ success: false, error: 'All required school registration fields must be completed.' });
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(schoolEmail)) {
    return createJsonResponse_({ success: false, error: 'Invalid official school email format.' });
  }

  if (phone.replace(/[^0-9]/g, '').length < 7) {
    return createJsonResponse_({ success: false, error: 'Phone number must contain at least 7 digits.' });
  }

  var db = getOrCreateDatabase_();
  var rows = db.registrations.getDataRange().getValues();
  var cleanName = schoolName.toLowerCase();

  for (var r = 1; r < rows.length; r++) {
    var rowEmail = String(rows[r][2] || '').trim().toLowerCase();
    var rowName = String(rows[r][1] || '').trim().toLowerCase();
    var rowStatus = String(rows[r][9] || '').trim().toUpperCase();
    if ((rowEmail === schoolEmail || rowName === cleanName) && rowStatus !== 'REJECTED') {
      return createJsonResponse_({
        success: false,
        error: 'Duplicate submission prevented: an active or pending registration already exists.'
      });
    }
  }

  var year = new Date().getFullYear();
  var randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  var registrationId = data.id || ('REG-' + year + '-' + randomCode);
  var submittedDate = data.submissionDate || new Date().toISOString();

  var docResult = null;
  if (data.documentFile) {
    try {
      docResult = uploadRegistrationDocument_(registrationId, schoolName, data.documentFile);
    } catch (docErr) {
      Logger.log('Document upload notice: ' + docErr.message);
    }
  }

  db.registrations.appendRow([
    registrationId,
    schoolName,
    schoolEmail,
    contactPerson,
    phone,
    address,
    district,
    schoolType,
    submittedDate,
    'PENDING',
    '',
    '',
    '',
    additionalInfo,
    docResult ? docResult.fileUrl : '',
    ''
  ]);

  logActivity_(
    'SCHOOL_REGISTERED',
    schoolEmail,
    registrationId,
    schoolName,
    'New school registration submitted and stored with PENDING status.' + (docResult ? ' Attached: ' + docResult.fileName : ''),
    'PENDING'
  );

  return createJsonResponse_({
    success: true,
    message: 'Your school registration has been submitted successfully. Our administration team will review your application.',
    registrationId: registrationId,
    status: 'PENDING',
    submissionDate: submittedDate,
    driveFileId: docResult ? docResult.fileId : '',
    driveFileUrl: docResult ? docResult.fileUrl : ''
  });
}

function handleGetApplications_(data) {
  var operatorEmail = String(data.operatorEmail || data.actorEmail || '').toLowerCase().trim();
  if (operatorEmail && CONFIG.AUTHORIZED_OPERATORS.indexOf(operatorEmail) === -1) {
    return createJsonResponse_({ success: false, error: 'Unauthorized operator access.' });
  }

  var db = getOrCreateDatabase_();
  var rows = db.registrations.getDataRange().getValues();
  var applications = [];

  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[0]) continue;
    applications.push({
      id: String(row[0]),
      schoolName: String(row[1]),
      administratorEmail: String(row[2]),
      administratorName: String(row[3]),
      contactNumber: String(row[4]),
      address: String(row[5]),
      district: String(row[6]),
      schoolType: String(row[7]),
      submissionDate: String(row[8]),
      status: String(row[9] || 'PENDING').toUpperCase(),
      operatorRemarks: String(row[10] || ''),
      approvalDate: String(row[11] || ''),
      approvedBy: String(row[12] || ''),
      additionalInfo: String(row[13] || ''),
      driveFileUrl: String(row[14] || ''),
      schoolId: String(row[15] || '')
    });
  }

  return createJsonResponse_({ success: true, count: applications.length, applications: applications });
}

// ============================================================================
// 4. OPERATOR APPROVAL & REJECTION AUTOMATION
// ============================================================================
function handleApproveApplication_(data) {
  var operatorEmail = String(data.operatorEmail || data.actorEmail || CONFIG.PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  if (CONFIG.AUTHORIZED_OPERATORS.indexOf(operatorEmail) === -1) {
    return createJsonResponse_({ success: false, error: 'Unauthorized: Only authorized JMC operators can approve applications.' });
  }

  var registrationId = String(data.applicationId || data.registrationId || data.id || '').trim();
  if (!registrationId) {
    return createJsonResponse_({ success: false, error: 'Missing Registration ID.' });
  }

  var folders = ensureAutomationFolders_();
  var db = getOrCreateDatabase_(folders.rootFolder);
  var rows = db.registrations.getDataRange().getValues();
  var targetRowIndex = -1;
  var rowData = null;

  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]).trim() === registrationId) {
      targetRowIndex = r + 1;
      rowData = rows[r];
      break;
    }
  }

  // If the application originated in the web platform before Apps Script was linked, insert it cleanly first
  if ((targetRowIndex === -1 || !rowData) && data.application) {
    var fallbackApp = data.application;
    db.registrations.appendRow([
      registrationId,
      String(fallbackApp.schoolName || ''),
      String(fallbackApp.administratorEmail || '').toLowerCase(),
      String(fallbackApp.administratorName || fallbackApp.principalName || ''),
      String(fallbackApp.contactNumber || ''),
      String(fallbackApp.address || ''),
      String(fallbackApp.district || ''),
      String(fallbackApp.schoolType || 'School'),
      String(fallbackApp.submissionDate || new Date().toISOString()),
      'PENDING',
      '',
      '',
      '',
      String(fallbackApp.additionalInfo || ''),
      String(fallbackApp.driveFileUrl || ''),
      ''
    ]);
    targetRowIndex = db.registrations.getLastRow();
    rowData = db.registrations.getRange(targetRowIndex, 1, 1, REGISTRATION_HEADERS.length).getValues()[0];
  }

  if (targetRowIndex === -1 || !rowData) {
    return createJsonResponse_({ success: false, error: 'Registration record not found: ' + registrationId });
  }

  if (String(rowData[9]).trim().toUpperCase() === 'APPROVED') {
    return createJsonResponse_({ success: true, applicationId: registrationId, status: 'APPROVED', alreadyApproved: true });
  }

  var schoolName = String(rowData[1]);
  var schoolEmail = String(rowData[2]);
  var contactPerson = String(rowData[3]);
  var phone = String(rowData[4]);
  var address = String(rowData[5]);
  var district = String(rowData[6]);
  var schoolType = String(rowData[7]);

  var cleanPrefix = schoolName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'SCH';
  var schoolId = data.schoolId || ('SCH-' + cleanPrefix + '-' + Math.random().toString(36).substring(2, 7).toUpperCase());
  var approvalDate = new Date().toISOString();
  var operatorNotes = data.operatorRemarks ? String(data.operatorRemarks).trim() : 'Approved by JMC Platform Operator';
  var approvedBy = String(data.operatorName || operatorEmail);

  // Update Sheet 1: School Registrations
  db.registrations.getRange(targetRowIndex, 10).setValue('APPROVED');
  db.registrations.getRange(targetRowIndex, 11).setValue(operatorNotes);
  db.registrations.getRange(targetRowIndex, 12).setValue(approvalDate);
  db.registrations.getRange(targetRowIndex, 13).setValue(approvedBy);
  db.registrations.getRange(targetRowIndex, 16).setValue(schoolId);

  // Append to Sheet 2: Approved Schools
  db.approved.appendRow([
    schoolId,
    registrationId,
    schoolName,
    schoolEmail,
    contactPerson,
    phone,
    address,
    district,
    schoolType,
    approvalDate,
    approvedBy,
    operatorNotes,
    'ACTIVE'
  ]);

  // Save approval record file to Drive "Approved Schools" folder
  try {
    folders.approved.createFile(
      schoolId + '_' + schoolName.replace(/[^a-zA-Z0-9]/g, '_') + '.json',
      JSON.stringify({
        schoolId: schoolId,
        registrationId: registrationId,
        schoolName: schoolName,
        administratorEmail: schoolEmail,
        contactPerson: contactPerson,
        phone: phone,
        address: address,
        district: district,
        schoolType: schoolType,
        approvedBy: approvedBy,
        approvalDate: approvalDate,
        operatorNotes: operatorNotes,
        status: 'ACTIVE'
      }, null, 2),
      MimeType.PLAIN_TEXT
    );
  } catch (driveErr) {}

  // Send Email using verified account or alias
  sendAutomationEmail_(
    schoolEmail,
    'JMC Classroom – Your School Registration Has Been Approved!',
    'Dear ' + contactPerson + ',\n\n' +
      'Congratulations!\n\n' +
      'Your school registration application for ' + schoolName + ' has been reviewed and APPROVED by ' + approvedBy + '.\n\n' +
      'Assigned School ID: ' + schoolId + '\n' +
      'Registered Google Account Email: ' + schoolEmail + '\n' +
      'Approval Date: ' + approvalDate + '\n' +
      'Platform Portal: ' + CONFIG.PLATFORM_URL + '\n\n' +
      'You can now log into the JMC Classroom School Administrator Portal using Google Sign-In.\n\n' +
      'Best Regards,\nJMC Classroom Administration Team\n' + CONFIG.PRIMARY_OPERATOR_EMAIL
  );

  logActivity_(
    'APPROVE_SCHOOL',
    operatorEmail,
    schoolId,
    schoolName,
    'Approved registration ' + registrationId + ' and dispatched email to ' + schoolEmail,
    'APPROVED'
  );

  return createJsonResponse_({
    success: true,
    applicationId: registrationId,
    schoolId: schoolId,
    status: 'APPROVED',
    approvalDate: approvalDate,
    approvedBy: approvedBy
  });
}

function handleRejectApplication_(data) {
  var operatorEmail = String(data.operatorEmail || data.actorEmail || CONFIG.PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  if (CONFIG.AUTHORIZED_OPERATORS.indexOf(operatorEmail) === -1) {
    return createJsonResponse_({ success: false, error: 'Unauthorized: Only authorized JMC operators can reject applications.' });
  }

  var registrationId = String(data.applicationId || data.registrationId || data.id || '').trim();
  if (!registrationId) {
    return createJsonResponse_({ success: false, error: 'Missing Registration ID.' });
  }

  var folders = ensureAutomationFolders_();
  var db = getOrCreateDatabase_(folders.rootFolder);
  var rows = db.registrations.getDataRange().getValues();
  var targetRowIndex = -1;
  var rowData = null;

  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]).trim() === registrationId) {
      targetRowIndex = r + 1;
      rowData = rows[r];
      break;
    }
  }

  if ((targetRowIndex === -1 || !rowData) && data.application) {
    var fallbackRejApp = data.application;
    db.registrations.appendRow([
      registrationId,
      String(fallbackRejApp.schoolName || ''),
      String(fallbackRejApp.administratorEmail || '').toLowerCase(),
      String(fallbackRejApp.administratorName || fallbackRejApp.principalName || ''),
      String(fallbackRejApp.contactNumber || ''),
      String(fallbackRejApp.address || ''),
      String(fallbackRejApp.district || ''),
      String(fallbackRejApp.schoolType || 'School'),
      String(fallbackRejApp.submissionDate || new Date().toISOString()),
      'PENDING',
      '',
      '',
      '',
      String(fallbackRejApp.additionalInfo || ''),
      String(fallbackRejApp.driveFileUrl || ''),
      ''
    ]);
    targetRowIndex = db.registrations.getLastRow();
    rowData = db.registrations.getRange(targetRowIndex, 1, 1, REGISTRATION_HEADERS.length).getValues()[0];
  }

  if (targetRowIndex === -1 || !rowData) {
    return createJsonResponse_({ success: false, error: 'Registration record not found: ' + registrationId });
  }

  var schoolName = String(rowData[1]);
  var schoolEmail = String(rowData[2]);
  var contactPerson = String(rowData[3]);
  var phone = String(rowData[4]);
  var address = String(rowData[5]);
  var district = String(rowData[6]);
  var schoolType = String(rowData[7]);

  var rejectedDate = new Date().toISOString();
  var operatorNotes = data.operatorRemarks
    ? String(data.operatorRemarks).trim()
    : 'Application did not meet current verification criteria.';
  var rejectedBy = String(data.operatorName || operatorEmail);

  // Update Sheet 1: School Registrations
  db.registrations.getRange(targetRowIndex, 10).setValue('REJECTED');
  db.registrations.getRange(targetRowIndex, 11).setValue(operatorNotes);
  db.registrations.getRange(targetRowIndex, 12).setValue(rejectedDate);
  db.registrations.getRange(targetRowIndex, 13).setValue(rejectedBy);

  // Append to Sheet 3: Rejected Schools
  db.rejected.appendRow([
    registrationId,
    schoolName,
    schoolEmail,
    contactPerson,
    phone,
    address,
    district,
    schoolType,
    rejectedDate,
    rejectedBy,
    operatorNotes,
    'REJECTED'
  ]);

  try {
    folders.rejected.createFile(
      registrationId + '_REJECTED.json',
      JSON.stringify({
        registrationId: registrationId,
        schoolName: schoolName,
        schoolEmail: schoolEmail,
        rejectedBy: rejectedBy,
        rejectedDate: rejectedDate,
        reason: operatorNotes
      }, null, 2),
      MimeType.PLAIN_TEXT
    );
  } catch (driveErr) {}

  sendAutomationEmail_(
    schoolEmail,
    'JMC Classroom – School Registration Update',
    'Dear ' + contactPerson + ',\n\n' +
      'Thank you for registering ' + schoolName + ' with JMC Classroom (' + CONFIG.PLATFORM_URL + ').\n\n' +
      'Unfortunately, your application could not be approved at this time.\n\n' +
      'Operator Notes:\n' + operatorNotes + '\n\n' +
      'Please review your submitted details and submit a new application if needed.\n\n' +
      'Best Regards,\nJMC Classroom Administration Team\n' + CONFIG.PRIMARY_OPERATOR_EMAIL
  );

  logActivity_(
    'REJECT_SCHOOL',
    operatorEmail,
    registrationId,
    schoolName,
    'Rejected registration with reason: ' + operatorNotes,
    'REJECTED'
  );

  return createJsonResponse_({
    success: true,
    applicationId: registrationId,
    status: 'REJECTED',
    operatorRemarks: operatorNotes
  });
}

// ============================================================================
// EMAIL SENDING WITH ALIAS & DOMAIN ALIAS SUPPORT
// ============================================================================
function sendAutomationEmail_(toEmail, subject, body) {
  var account = verifyAuthorizedAccount_();
  var options = {
    name: CONFIG.SENDER_NAME,
    replyTo: CONFIG.PRIMARY_OPERATOR_EMAIL
  };
  if (account.mode === 'verified_send_as_alias' || account.mode === 'direct_account') {
    options.from = account.sendFrom;
  }
  GmailApp.sendEmail(toEmail, subject, body, options);
}

// ============================================================================
// SYSTEM REPORTS & DRIVE BACKUPS
// ============================================================================
function generateSystemReport() {
  var folders = ensureAutomationFolders_();
  var db = getOrCreateDatabase_(folders.rootFolder);
  var rows = db.registrations.getDataRange().getValues();
  var pending = 0, approved = 0, rejected = 0;

  for (var r = 1; r < rows.length; r++) {
    var st = String(rows[r][9] || '').toUpperCase();
    if (st === 'PENDING') pending++;
    else if (st === 'APPROVED') approved++;
    else if (st === 'REJECTED') rejected++;
  }

  var reportContent =
    'JMC CLASSROOM – SYSTEM AUTOMATION REPORT\n' +
    'Generated: ' + new Date().toISOString() + '\n' +
    'Primary Operator Account: ' + CONFIG.PRIMARY_OPERATOR_EMAIL + '\n' +
    '------------------------------------------------------------\n' +
    'Total Registrations: ' + Math.max(rows.length - 1, 0) + '\n' +
    'Pending: ' + pending + '\n' +
    'Approved: ' + approved + '\n' +
    'Rejected: ' + rejected + '\n' +
    'Database URL: ' + db.spreadsheet.getUrl() + '\n';

  var fileName = 'JMC_System_Report_' + Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd_HHmm') + '.txt';
  var file = folders.reports.createFile(fileName, reportContent, MimeType.PLAIN_TEXT);

  logActivity_('GENERATE_REPORT', CONFIG.PRIMARY_OPERATOR_EMAIL, file.getId(), CONFIG.PLATFORM_NAME, 'Saved report: ' + fileName, 'SUCCESS');
  return { success: true, fileId: file.getId(), fileUrl: file.getUrl(), fileName: fileName };
}

function createDatabaseBackup() {
  var folders = ensureAutomationFolders_();
  var db = getOrCreateDatabase_(folders.rootFolder);
  var payload = {
    exportedAt: new Date().toISOString(),
    registrations: db.registrations.getDataRange().getValues(),
    approvedSchools: db.approved.getDataRange().getValues(),
    rejectedSchools: db.rejected.getDataRange().getValues(),
    activityLogs: db.logs.getDataRange().getValues()
  };

  var fileName = 'JMC_Backup_' + Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd_HHmm') + '.json';
  var file = folders.backups.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);

  logActivity_('DATABASE_BACKUP', CONFIG.PRIMARY_OPERATOR_EMAIL, file.getId(), CONFIG.PLATFORM_NAME, 'Saved backup: ' + fileName, 'SUCCESS');
  return { success: true, fileId: file.getId(), fileUrl: file.getUrl(), fileName: fileName };
}

// ============================================================================
// BULK SYNC FROM PLATFORM STORE / FIRESTORE TO GOOGLE SHEETS
// ============================================================================
function handleSyncApplications_(data) {
  var operatorEmail = String(data.operatorEmail || data.actorEmail || CONFIG.PRIMARY_OPERATOR_EMAIL).toLowerCase().trim();
  if (CONFIG.AUTHORIZED_OPERATORS.indexOf(operatorEmail) === -1) {
    return createJsonResponse_({ success: false, error: 'Unauthorized: Only authorized JMC operators can sync data.' });
  }

  var folders = ensureAutomationFolders_();
  var db = getOrCreateDatabase_(folders.rootFolder);
  var applications = Array.isArray(data.applications) ? data.applications : [];
  var schools = Array.isArray(data.schools) ? data.schools : [];

  var regRows = db.registrations.getDataRange().getValues();
  var regMap = {};
  for (var r = 1; r < regRows.length; r++) {
    var rid = String(regRows[r][0] || '').trim();
    if (rid) regMap[rid] = r + 1;
  }

  var syncedApplications = 0;
  for (var i = 0; i < applications.length; i++) {
    var app = applications[i];
    if (!app || !app.id) continue;
    var rowVals = [
      String(app.id),
      String(app.schoolName || ''),
      String(app.administratorEmail || '').toLowerCase(),
      String(app.administratorName || app.principalName || ''),
      String(app.contactNumber || ''),
      String(app.address || ''),
      String(app.district || ''),
      String(app.schoolType || ''),
      String(app.submissionDate || app.createdAt || ''),
      String(app.status || 'PENDING').toUpperCase(),
      String(app.operatorRemarks || ''),
      String(app.approvalDate || ''),
      String(app.approvedByEmail || app.approvedBy || ''),
      String(app.additionalInfo || ''),
      String(app.driveFileUrl || ''),
      String(app.schoolId || '')
    ];
    if (regMap[app.id]) {
      db.registrations.getRange(regMap[app.id], 1, 1, REGISTRATION_HEADERS.length).setValues([rowVals]);
    } else {
      db.registrations.appendRow(rowVals);
      regMap[app.id] = db.registrations.getLastRow();
    }
    syncedApplications++;
  }

  var appRows = db.approved.getDataRange().getValues();
  var appMap = {};
  for (var a = 1; a < appRows.length; a++) {
    var sid = String(appRows[a][0] || '').trim();
    if (sid) appMap[sid] = a + 1;
  }

  var syncedSchools = 0;
  for (var j = 0; j < schools.length; j++) {
    var sch = schools[j];
    if (!sch || !sch.id) continue;
    var sVals = [
      String(sch.id),
      String(sch.applicationId || ''),
      String(sch.name || sch.schoolName || ''),
      String(sch.administratorEmail || sch.adminEmail || sch.email || '').toLowerCase(),
      String(sch.administratorName || sch.principalName || ''),
      String(sch.contactNumber || sch.phone || ''),
      String(sch.address || ''),
      String(sch.district || ''),
      String(sch.schoolType || ''),
      String(sch.approvedAt || sch.createdAt || ''),
      String(sch.approvedBy || operatorEmail),
      'Synced from JMC Classroom Platform',
      String(sch.status || 'ACTIVE').toUpperCase()
    ];
    if (appMap[sch.id]) {
      db.approved.getRange(appMap[sch.id], 1, 1, APPROVED_HEADERS.length).setValues([sVals]);
    } else {
      db.approved.appendRow(sVals);
      appMap[sch.id] = db.approved.getLastRow();
    }
    syncedSchools++;
  }

  logActivity_(
    'SYNC_APPLICATIONS',
    operatorEmail,
    db.spreadsheet.getId(),
    CONFIG.PLATFORM_NAME,
    'Synced ' + syncedApplications + ' applications and ' + syncedSchools + ' schools to Google Sheets.',
    'SUCCESS'
  );

  return createJsonResponse_({
    success: true,
    syncedApplications: syncedApplications,
    syncedSchools: syncedSchools,
    rootFolderId: folders.rootFolder.getId(),
    rootFolderUrl: folders.rootFolder.getUrl(),
    spreadsheetId: db.spreadsheet.getId(),
    spreadsheetUrl: db.spreadsheet.getUrl()
  });
}

function createJsonResponse_(payload) {
  var output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
