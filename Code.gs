/**
 * ============================================================================
 * JMC CLASSROOM – SCHOOL REGISTRATION & OPERATOR APPROVAL SYSTEM
 * Google Apps Script Web App (Code.gs)
 * ============================================================================
 * 
 * Instructions:
 * 1. Open Google Sheets (create a new sheet or use an existing one).
 * 2. Click "Extensions" > "Apps Script".
 * 3. Replace all contents in Code.gs with this file.
 * 4. Update the CONFIGURATION values below (SPREADSHEET_ID, API_SECRET_KEY).
 * 5. Click "Deploy" > "New deployment".
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Description: "JMC Classroom School Registration API"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone"
 * 8. Authorize the permissions (Google Sheets and Gmail / MailApp).
 * 9. Copy the generated Web App URL and set it in your environment:
 *    GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"
 */

// ============================================================================
// CONFIGURATION (Placeholders to be customized)
// ============================================================================
var CONFIG = {
  // If left empty (''), the script binds to the active spreadsheet containing the script.
  // Otherwise, paste your specific Google Spreadsheet ID here.
  SPREADSHEET_ID: '', // e.g. '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  
  // Sheet tab name for storing registration applications
  SHEET_NAME: 'SchoolApplications',

  // Shared secret key for operator actions (optional security check)
  API_SECRET_KEY: 'JMC_OPERATOR_SECRET_KEY_2026',

  // Sender display name for automated emails
  SENDER_NAME: 'JMC Classroom Administration Team',

  // Platform title
  PLATFORM_NAME: 'JMC Classroom'
};

// Expected Google Sheet Column Headers (17 columns)
var HEADERS = [
  'Application ID',
  'School Name',
  'Principal Name',
  'Administrator Name',
  'Administrator Email',
  'Contact Number',
  'Province',
  'District',
  'Address',
  'School Type',
  'Website',
  'Additional Information',
  'Submission Date',
  'Application Status',
  'Operator Remarks',
  'Approval Date',
  'School ID'
];

/**
 * Helper to get or create the designated sheet tab with formatted headers
 */
function getOrCreateSheet() {
  var ss = CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID !== ''
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error('Spreadsheet could not be opened. Please verify SPREADSHEET_ID.');
  }

  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  // If sheet is empty, initialize headers
  if (sheet.getLastRowNum() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    for (var i = 1; i <= HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }

  return sheet;
}

/**
 * HTTP GET endpoint - health check or get applications
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'ping';

    if (action === 'getApplications') {
      return handleGetApplications(params);
    }

    return createJsonResponse({
      success: true,
      service: 'JMC Classroom School Registration API',
      status: 'online',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.message || String(err)
    }, 500);
  }
}

/**
 * HTTP POST endpoint - main handler for registration, approval, rejection
 */
function doPost(e) {
  try {
    var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var data;
    try {
      data = JSON.parse(rawBody);
    } catch (parseErr) {
      data = e.parameter || {};
    }

    var action = data.action || (e.parameter ? e.parameter.action : '');

    switch (action) {
      case 'register':
      case 'submitApplication':
        return handleRegisterSchool(data);

      case 'getApplications':
        return handleGetApplications(data);

      case 'approveApplication':
        return handleApproveApplication(data);

      case 'rejectApplication':
        return handleRejectApplication(data);

      default:
        return createJsonResponse({
          success: false,
          error: 'Invalid or missing action. Supported: register, getApplications, approveApplication, rejectApplication'
        }, 400);
    }
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.message || String(err)
    }, 500);
  }
}

/**
 * 1. REGISTER SCHOOL APPLICATION
 */
function handleRegisterSchool(data) {
  // Validate Required Fields
  var requiredFields = [
    'schoolName',
    'principalName',
    'administratorName',
    'administratorEmail',
    'contactNumber',
    'province',
    'district',
    'address',
    'schoolType'
  ];

  for (var i = 0; i < requiredFields.length; i++) {
    var field = requiredFields[i];
    if (!data[field] || String(data[field]).trim() === '') {
      return createJsonResponse({
        success: false,
        error: 'Missing required field: ' + field
      }, 400);
    }
  }

  // Validate Email
  var email = String(data.administratorEmail).trim().toLowerCase();
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return createJsonResponse({
      success: false,
      error: 'Invalid administrator email format.'
    }, 400);
  }

  // Validate Contact Number (at least 7 digits)
  var phone = String(data.contactNumber).trim();
  var digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 7) {
    return createJsonResponse({
      success: false,
      error: 'Contact number must contain at least 7 digits.'
    }, 400);
  }

  var sheet = getOrCreateSheet();
  var rows = sheet.getDataRange().getValues();

  // Prevent duplicate applications for pending or approved schools
  var schoolNameClean = String(data.schoolName).trim().toLowerCase();
  for (var r = 1; r < rows.length; r++) {
    var existingEmail = String(rows[r][4]).trim().toLowerCase();
    var existingName = String(rows[r][1]).trim().toLowerCase();
    var existingStatus = String(rows[r][13]).trim().toUpperCase();

    if ((existingEmail === email || existingName === schoolNameClean) && existingStatus !== 'REJECTED') {
      return createJsonResponse({
        success: false,
        error: 'An active or pending application already exists for this school name or administrator email.'
      }, 409);
    }
  }

  // Generate unique Application ID: APP-YYYY-XXXXXX
  var year = new Date().getFullYear();
  var randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  var applicationId = data.id || ('APP-' + year + '-' + randomCode);
  var submissionDate = data.submissionDate || new Date().toISOString();
  var initialStatus = 'PENDING';

  var newRow = [
    applicationId,
    String(data.schoolName).trim(),
    String(data.principalName).trim(),
    String(data.administratorName).trim(),
    email,
    phone,
    String(data.province).trim(),
    String(data.district).trim(),
    String(data.address).trim(),
    String(data.schoolType).trim(),
    String(data.website || '').trim(),
    String(data.additionalInfo || '').trim(),
    submissionDate,
    initialStatus,
    '', // Operator Remarks
    '', // Approval Date
    ''  // School ID
  ];

  sheet.appendRow(newRow);

  return createJsonResponse({
    success: true,
    message: 'School registration application submitted successfully.',
    applicationId: applicationId,
    status: initialStatus,
    submissionDate: submissionDate
  });
}

/**
 * 2. GET APPLICATIONS
 */
function handleGetApplications(data) {
  var sheet = getOrCreateSheet();
  var rows = sheet.getDataRange().getValues();
  var applications = [];

  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[0]) continue; // Skip empty rows

    applications.push({
      id: String(row[0]),
      applicationId: String(row[0]),
      schoolName: String(row[1]),
      principalName: String(row[2]),
      administratorName: String(row[3]),
      administratorEmail: String(row[4]),
      contactNumber: String(row[5]),
      province: String(row[6]),
      district: String(row[7]),
      address: String(row[8]),
      schoolType: String(row[9]),
      website: String(row[10]),
      additionalInfo: String(row[11]),
      submissionDate: String(row[12]),
      status: String(row[13] || 'PENDING').toUpperCase(),
      operatorRemarks: String(row[14] || ''),
      approvalDate: String(row[15] || ''),
      schoolId: String(row[16] || '')
    });
  }

  return createJsonResponse({
    success: true,
    count: applications.length,
    applications: applications
  });
}

/**
 * 3. APPROVE APPLICATION & SEND APPROVAL EMAIL
 */
function handleApproveApplication(data) {
  var applicationId = String(data.applicationId || data.id || '').trim();
  if (!applicationId) {
    return createJsonResponse({ success: false, error: 'Missing applicationId' }, 400);
  }

  var sheet = getOrCreateSheet();
  var rows = sheet.getDataRange().getValues();
  var targetRowIndex = -1;
  var targetRowData = null;

  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]).trim() === applicationId) {
      targetRowIndex = r + 1; // 1-indexed in Sheets
      targetRowData = rows[r];
      break;
    }
  }

  if (targetRowIndex === -1 || !targetRowData) {
    return createJsonResponse({ success: false, error: 'Application not found with ID: ' + applicationId }, 404);
  }

  var currentStatus = String(targetRowData[13]).trim().toUpperCase();
  if (currentStatus !== 'PENDING') {
    return createJsonResponse({
      success: false,
      error: 'Cannot approve application with status ' + currentStatus + '. Only PENDING applications can be approved.'
    }, 400);
  }

  // Generate unique School ID
  var cleanSchoolName = String(targetRowData[1]).replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  var schoolId = data.schoolId || ('SCH-' + (cleanSchoolName || 'JMC') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase());
  var approvalDate = new Date().toISOString();
  var operatorRemarks = data.operatorRemarks ? String(data.operatorRemarks).trim() : 'Approved by Platform Operator';

  // Update Sheet columns: Status (Col 14), Remarks (Col 15), Approval Date (Col 16), School ID (Col 17)
  sheet.getRange(targetRowIndex, 14).setValue('APPROVED');
  sheet.getRange(targetRowIndex, 15).setValue(operatorRemarks);
  sheet.getRange(targetRowIndex, 16).setValue(approvalDate);
  sheet.getRange(targetRowIndex, 17).setValue(schoolId);

  var adminEmail = String(targetRowData[4]).trim();

  // Send Automatic Approval Email
  try {
    sendApprovalEmail(adminEmail, schoolId);
  } catch (emailErr) {
    Logger.log('Could not send approval email: ' + emailErr.message);
  }

  return createJsonResponse({
    success: true,
    message: 'Application approved successfully.',
    applicationId: applicationId,
    schoolId: schoolId,
    status: 'APPROVED',
    approvalDate: approvalDate,
    adminEmail: adminEmail
  });
}

/**
 * 4. REJECT APPLICATION & SEND REJECTION EMAIL
 */
function handleRejectApplication(data) {
  var applicationId = String(data.applicationId || data.id || '').trim();
  if (!applicationId) {
    return createJsonResponse({ success: false, error: 'Missing applicationId' }, 400);
  }

  var sheet = getOrCreateSheet();
  var rows = sheet.getDataRange().getValues();
  var targetRowIndex = -1;
  var targetRowData = null;

  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]).trim() === applicationId) {
      targetRowIndex = r + 1;
      targetRowData = rows[r];
      break;
    }
  }

  if (targetRowIndex === -1 || !targetRowData) {
    return createJsonResponse({ success: false, error: 'Application not found with ID: ' + applicationId }, 404);
  }

  var operatorRemarks = data.operatorRemarks
    ? String(data.operatorRemarks).trim()
    : 'Application does not meet current verification requirements.';
  var updateDate = new Date().toISOString();

  // Update Sheet columns: Status (Col 14), Remarks (Col 15), Rejection Date (Col 16)
  sheet.getRange(targetRowIndex, 14).setValue('REJECTED');
  sheet.getRange(targetRowIndex, 15).setValue(operatorRemarks);
  sheet.getRange(targetRowIndex, 16).setValue(updateDate);

  var adminEmail = String(targetRowData[4]).trim();

  // Send Automatic Rejection Email
  try {
    sendRejectionEmail(adminEmail, operatorRemarks);
  } catch (emailErr) {
    Logger.log('Could not send rejection email: ' + emailErr.message);
  }

  return createJsonResponse({
    success: true,
    message: 'Application rejected.',
    applicationId: applicationId,
    status: 'REJECTED',
    operatorRemarks: operatorRemarks,
    adminEmail: adminEmail
  });
}

/**
 * Section 5: Send Approval Email (Exact Template)
 */
function sendApprovalEmail(adminEmail, schoolId) {
  var subject = 'JMC Classroom – Your School Registration Has Been Approved!';
  
  var body = 'Dear School Administrator,\n\n' +
    'Congratulations!\n\n' +
    'Your school registration application has been successfully reviewed and APPROVED by the JMC Classroom Operator.\n\n' +
    'Your school is now registered in the JMC Classroom platform.\n\n' +
    'Your School ID: ' + schoolId + '\n\n' +
    'Your registered administrator email:\n' +
    adminEmail + '\n\n' +
    'You can now log in using your registered Google account and continue setting up your school.\n\n' +
    'Welcome to JMC Classroom!\n\n' +
    'Best Regards,\n' +
    'JMC Classroom Administration Team\n' +
    'JMC Innovators';

  MailApp.sendEmail({
    to: adminEmail,
    subject: subject,
    body: body,
    name: CONFIG.SENDER_NAME
  });
}

/**
 * Section 6: Send Rejection Email (Exact Template)
 */
function sendRejectionEmail(adminEmail, operatorRemarks) {
  var subject = 'JMC Classroom – School Registration Update';
  
  var body = 'Dear School Administrator,\n\n' +
    'Thank you for registering your school with JMC Classroom.\n\n' +
    'Unfortunately, your application could not be approved at this time.\n\n' +
    'Operator Remarks:\n' +
    operatorRemarks + '\n\n' +
    'Please review your submitted information and correct any issues before submitting a new application.\n\n' +
    'You are welcome to try again.\n\n' +
    'Best Regards,\n' +
    'JMC Classroom Administration Team\n' +
    'JMC Innovators';

  MailApp.sendEmail({
    to: adminEmail,
    subject: subject,
    body: body,
    name: CONFIG.SENDER_NAME
  });
}

/**
 * Helper to build JSON responses with proper headers
 */
function createJsonResponse(payload, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
