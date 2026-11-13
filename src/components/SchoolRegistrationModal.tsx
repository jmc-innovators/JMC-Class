import React, { useState, useRef } from 'react';
import {
  School,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building,
  User,
  MapPin,
  Loader2,
  Sparkles,
  Upload,
  FileText,
  Trash2,
} from 'lucide-react';
import { SchoolApplication } from '../types';
import { submitSchoolApplication } from '../lib/firestoreService';

interface SchoolRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (application: SchoolApplication) => void;
}

const SRI_LANKA_PROVINCES: Record<string, string[]> = {
  'Northern Province': ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'],
  'Western Province': ['Colombo', 'Gampaha', 'Kalutara'],
  'Central Province': ['Kandy', 'Matale', 'Nuwara Eliya'],
  'Southern Province': ['Galle', 'Matara', 'Hambantota'],
  'Eastern Province': ['Batticaloa', 'Ampara', 'Trincomalee'],
  'North Western Province': ['Kurunegala', 'Puttalam'],
  'North Central Province': ['Anuradhapura', 'Polonnaruwa'],
  'Uva Province': ['Badulla', 'Monaragala'],
  'Sabaragamuwa Province': ['Ratnapura', 'Kegalle'],
};

const SCHOOL_TYPES = [
  'National School (Type 1AB)',
  'Provincial School (Type 1C)',
  'Type 2 School (Grade 6–11)',
  'Private / Semi-Government School',
  'International School (Edexcel / Cambridge)',
  'Autonomous Educational Institution',
];

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024; // 2 MB

export const SchoolRegistrationModal: React.FC<SchoolRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    schoolName: '',
    principalName: '',
    administratorName: '',
    administratorEmail: '',
    contactNumber: '',
    province: 'Northern Province',
    district: 'Jaffna',
    address: '',
    schoolType: 'National School (Type 1AB)',
    website: '',
    additionalInfo: '',
  });

  const [documentFile, setDocumentFile] = useState<{
    fileName: string;
    mimeType: string;
    size: number;
    base64Data: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<SchoolApplication | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      schoolName: '',
      principalName: '',
      administratorName: '',
      administratorEmail: '',
      contactNumber: '',
      province: 'Northern Province',
      district: 'Jaffna',
      address: '',
      schoolType: 'National School (Type 1AB)',
      website: '',
      additionalInfo: '',
    });
    setDocumentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
    setSubmittedApp(null);
    setSuccessMessage('');
  };

  const handleClose = () => {
    if (submittedApp) {
      resetForm();
    }
    onClose();
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value;
    const districts = SRI_LANKA_PROVINCES[prov] || [];
    setFormData((prev) => ({
      ...prev,
      province: prov,
      district: districts[0] || '',
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setDocumentFile(null);
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError('Supporting document must be 2 MB or smaller.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      const base64Part = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
      setDocumentFile({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        base64Data: base64Part,
      });
    };
    reader.onerror = () => {
      setError('Could not read the selected file. Please try another document.');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyId = () => {
    if (submittedApp?.id) {
      navigator.clipboard.writeText(submittedApp.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const validate = (): string | null => {
    if (!formData.schoolName.trim()) return 'School Name is required.';
    if (!formData.administratorName.trim()) return 'Contact Person / Administrator Name is required.';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.administratorEmail.trim() || !emailRegex.test(formData.administratorEmail.trim())) {
      return 'Please enter a valid Official School Email address.';
    }

    const digitsOnly = formData.contactNumber.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 7) {
      return 'Please provide a valid Phone Number with at least 7 digits.';
    }

    if (!formData.district.trim()) return 'District is required.';
    if (!formData.address.trim()) return 'School Address is required.';
    if (!formData.schoolType.trim()) return 'School Type is required.';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { application, message } = await submitSchoolApplication({
        schoolName: formData.schoolName.trim(),
        principalName: (formData.principalName || formData.administratorName).trim(),
        administratorName: formData.administratorName.trim(),
        administratorEmail: formData.administratorEmail.trim().toLowerCase(),
        contactNumber: formData.contactNumber.trim(),
        province: formData.province.trim(),
        district: formData.district.trim(),
        address: formData.address.trim(),
        schoolType: formData.schoolType.trim(),
        website: formData.website.trim(),
        additionalInfo: formData.additionalInfo.trim(),
        ...(documentFile ? { documentFile } : {}),
      });

      setSubmittedApp(application);
      setSuccessMessage(message);
      if (onSuccess) {
        onSuccess(application);
      }
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setError(err.message || 'Failed to submit application. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const availableDistricts = SRI_LANKA_PROVINCES[formData.province] || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#111624] border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                Register Your School
              </h2>
              <p className="text-xs text-slate-400">
                Official institution onboarding &amp; Google Workspace verification application
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-4 flex-1 pr-1 space-y-4">
          {submittedApp ? (
            /* Successful Submission View */
            <div className="py-6 px-4 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Status: {submittedApp.status}
                </span>
                <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
                  Registration Submitted
                </h3>
                <p className="text-xs sm:text-sm text-emerald-200 max-w-lg mx-auto leading-relaxed font-medium">
                  {successMessage ||
                    'Your school registration has been submitted successfully. Our administration team will review your application.'}
                </p>
              </div>

              {/* Application Details Card */}
              <div className="p-4 rounded-xl bg-[#161c2d] border border-white/10 text-left max-w-md mx-auto space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-slate-400 font-medium">Registration ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400 text-sm bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {submittedApp.id}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Copy Registration ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">School Name</span>
                  <span className="font-semibold text-white">{submittedApp.schoolName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Official School Email</span>
                  <span className="font-semibold text-indigo-300">{submittedApp.administratorEmail}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contact Person</span>
                  <span className="font-semibold text-slate-200">{submittedApp.administratorName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">District / Province</span>
                  <span className="font-semibold text-slate-200">
                    {submittedApp.district}, {submittedApp.province}
                  </span>
                </div>

                {submittedApp.documentName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Attached Document</span>
                    <span className="font-semibold text-emerald-300 truncate max-w-[200px]">
                      {submittedApp.documentName}
                    </span>
                  </div>
                )}
              </div>

              {/* What Happens Next Notice */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 max-w-md mx-auto text-left text-xs text-blue-200/90 leading-relaxed space-y-1.5">
                <div className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> What Happens Next?
                </div>
                <p>1. Your registration is queued for verification by the JMC Classroom Operator.</p>
                <p>
                  2. Upon approval, an automated confirmation email will be sent to{' '}
                  <b>{submittedApp.administratorEmail}</b> from our administration account.
                </p>
                <p>
                  3. You can then sign in directly with Google to manage Grade 6–11 classes, teachers, and students.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
                >
                  Submit Another School
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
                >
                  Close &amp; Return to Home
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Institution Info */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Institution Identification
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    School Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="e.g. Mahajana College, Tellippalai"
                    className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      School Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.schoolType}
                      onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {SCHOOL_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-[#111624] text-white">
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Principal Name <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.principalName}
                      onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                      placeholder="e.g. Mr. K. Pushparathanam"
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Person & Email */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Official School Contact &amp; Email
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Contact Person <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.administratorName}
                      onChange={(e) => setFormData({ ...formData, administratorName: e.target.value })}
                      placeholder="e.g. Sivaneswaran K."
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      placeholder="e.g. 076 391 7067 / 021 222 1234"
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Official School Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.administratorEmail}
                    onChange={(e) => setFormData({ ...formData, administratorEmail: e.target.value })}
                    placeholder="e.g. principal@mahajana.lk or school.admin@gmail.com"
                    className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Approval updates and School Admin portal access are provisioned for this Google email.
                  </span>
                </div>
              </div>

              {/* Section 3: Location */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Location &amp; Address
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Province <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.province}
                      onChange={handleProvinceChange}
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {Object.keys(SRI_LANKA_PROVINCES).map((prov) => (
                        <option key={prov} value={prov} className="bg-[#111624] text-white">
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      District <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {availableDistricts.map((dist) => (
                        <option key={dist} value={dist} className="bg-[#111624] text-white">
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Ampaani Road, Tellippalai, Jaffna"
                    className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Section 4: Additional Info & Optional Google Drive Document */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Additional Information <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.additionalInfo}
                      onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                      placeholder="e.g. Grade 6–11 student count: 450"
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      School Website <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="e.g. https://mahajana.lk"
                      className="w-full bg-[#171d2d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Optional Document Upload */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Supporting Document (Verification Letter / MOE Registration){' '}
                    <span className="text-slate-500">(optional, max 2 MB)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <label className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#171d2d] border border-dashed border-white/20 hover:border-blue-500/60 cursor-pointer text-xs text-slate-300 transition-colors">
                      <Upload className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {documentFile
                          ? `${documentFile.fileName} (${Math.round(documentFile.size / 1024)} KB)`
                          : 'Attach PDF, PNG, JPG, or DOCX for Google Drive archiving'}
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {documentFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setDocumentFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  {documentFile && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ready to archive in Google Drive &quot;School Registrations&quot; folder.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  <span className="text-rose-400">*</span> Required fields
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Submitting Application…</span>
                      </>
                    ) : (
                      <>
                        <School className="w-4 h-4" />
                        <span>Submit Registration</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
