/**
 * Onboarding — wallet pre-registration form.
 *
 * Collects official Wallet KIT fields and submits via
 * POST /wallet?state=precreate through walletService.precreateWallet().
 *
 * On success, stores the returned token and navigates to /wallet-activation.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { precreateWallet } from '../../services/walletService.js';
import { saveStoredUserIdentity } from '../../utils/userIdentity.js';
import PrimaryButton from '../ui/PrimaryButton.jsx';

// ─── Field definitions ──────────────────────────────────────
// Each field maps a friendly UI label to the official API field name.
const FIELD_SECTIONS = [
  {
    title: 'Personal information',
    fields: [
      {
        name: 'clientFirstName',
        label: 'First name',
        type: 'text',
        placeholder: 'e.g. Yassine',
        required: true,
        autoComplete: 'given-name',
      },
      {
        name: 'clientLastName',
        label: 'Last name',
        type: 'text',
        placeholder: 'e.g. El Amrani',
        required: true,
        autoComplete: 'family-name',
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        options: [
          { value: '', label: 'Select…' },
          { value: 'M', label: 'Male' },
          { value: 'F', label: 'Female' },
        ],
      },
      {
        name: 'dateOfBirth',
        label: 'Date of birth',
        type: 'date',
        required: true,
        autoComplete: 'bday',
      },
      {
        name: 'placeOfBirth',
        label: 'Place of birth',
        type: 'text',
        placeholder: 'e.g. Casablanca',
        required: true,
      },
    ],
  },
  {
    title: 'Contact details',
    fields: [
      {
        name: 'phoneNumber',
        label: 'Phone number',
        type: 'tel',
        placeholder: 'e.g. 212700446631',
        helperText: 'Include country code without + sign',
        required: true,
        autoComplete: 'tel',
      },
      {
        name: 'phoneOperator',
        label: 'Phone operator',
        type: 'select',
        required: true,
        options: [
          { value: '', label: 'Select…' },
          { value: 'IAM', label: 'IAM' },
          { value: 'INWI', label: 'Inwi' },
          { value: 'ORANGE', label: 'Orange' },
        ],
      },
      {
        name: 'email',
        label: 'Email address',
        type: 'email',
        placeholder: 'e.g. yassine@university.ma',
        required: true,
        autoComplete: 'email',
      },
    ],
  },
  {
    title: 'Identity & address',
    fields: [
      {
        name: 'legalType',
        label: 'ID document type',
        type: 'select',
        required: true,
        options: [
          { value: '', label: 'Select…' },
          { value: 'CIN', label: 'CIN (National ID)' },
          { value: 'PASSPORT', label: 'Passport' },
          { value: 'RESIDENCE_PERMIT', label: 'Residence permit' },
        ],
      },
      {
        name: 'legalId',
        label: 'ID number',
        type: 'text',
        placeholder: 'e.g. AB123456',
        required: true,
      },
      {
        name: 'clientAddress',
        label: 'Address',
        type: 'text',
        placeholder: 'e.g. 12 Rue Al Massira, Rabat',
        required: true,
        autoComplete: 'street-address',
      },
    ],
  },
];

// ─── Build initial form state from field definitions ────────
function buildInitialState() {
  const state = { countryCode: '212' };
  FIELD_SECTIONS.forEach((section) =>
    section.fields.forEach((f) => {
      state[f.name] = '';
    })
  );
  return state;
}

// ─── Validation ─────────────────────────────────────────────
function validate(form) {
  const errors = {};

  // Required check
  FIELD_SECTIONS.forEach((section) =>
    section.fields.forEach((f) => {
      if (f.required && !form[f.name]?.trim()) {
        errors[f.name] = 'This field is required';
      }
    })
  );

  // Phone format (9 digits for local portion)
  if (form.phoneNumber && !/^\d{9}$/.test(form.phoneNumber.trim())) {
    errors.phoneNumber = 'Enter a valid 9-digit phone number';
  }

  // Email format
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  // Date of birth — must be in the past and user should be at least 16
  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (dob >= today) {
      errors.dateOfBirth = 'Date of birth must be in the past';
    } else if (age < 16) {
      errors.dateOfBirth = 'You must be at least 16 years old';
    }
  }

  return errors;
}

// ─── Reusable input component ───────────────────────────────
function FormField({ field, value, error, touched, onChange, onBlur }) {
  const baseInputClass = `
    w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white
    outline-none transition-all duration-200
    placeholder:text-surface-300
    focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
    ${error && touched
      ? 'border-danger-400 bg-danger-50/30'
      : 'border-surface-200 hover:border-surface-300'
    }
  `;

  return (
    <div>
      <label
        htmlFor={field.name}
        className="block text-sm font-medium text-surface-700 mb-1.5"
      >
        {field.label}
        {field.required && <span className="text-danger-400 ml-0.5">*</span>}
      </label>

      {field.type === 'select' ? (
        <select
          id={field.name}
          name={field.name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`${baseInputClass} ${!value ? 'text-surface-400' : 'text-surface-900'}`}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          name={field.name}
          type={field.type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          className={`${baseInputClass} text-surface-900`}
        />
      )}

      {field.helperText && !error && (
        <p className="mt-1 text-xs text-surface-400">{field.helperText}</p>
      )}
      {error && touched && (
        <p className="mt-1 text-xs text-danger-500 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState(buildInitialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear error on edit
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate single field on blur
    const fieldErrors = validate(form);
    if (fieldErrors[name]) {
      setErrors((prev) => ({ ...prev, [name]: fieldErrors[name] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Touch all fields to show errors
    const allTouched = {};
    FIELD_SECTIONS.forEach((section) =>
      section.fields.forEach((f) => {
        allTouched[f.name] = true;
      })
    );
    setTouched(allTouched);

    // Full validation
    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorField)?.focus();
      return;
    }

    // Build payload with official field names
    const payload = {
      phoneNumber: '+' + form.countryCode + form.phoneNumber.trim(),
      phoneOperator: form.phoneOperator,
      clientFirstName: form.clientFirstName.trim(),
      clientLastName: form.clientLastName.trim(),
      email: form.email.trim(),
      placeOfBirth: form.placeOfBirth.trim(),
      dateOfBirth: form.dateOfBirth,
      clientAddress: form.clientAddress.trim(),
      gender: form.gender,
      legalType: form.legalType,
      legalId: form.legalId.trim(),
    };

    setSubmitting(true);
    try {
      const response = await precreateWallet(payload);

      // Store the token from the response for the activation step
      if (response?.result?.token) {
        localStorage.setItem('aura_precreate_token', response.result.token);
      }
      if (response?.result?.otp) {
        // In production the OTP is sent via SMS; for demo we store it
        localStorage.setItem('aura_precreate_otp', response.result.otp);
      }

      // Persist identity fields for later use by POST /wallet/clientinfo
      // Maps: legalType → identificationType, legalId → identificationNumber
      saveStoredUserIdentity({
        phoneNumber: payload.phoneNumber,
        identificationType: form.legalType,
        identificationNumber: form.legalId.trim(),
        firstName: form.clientFirstName.trim(),
        lastName: form.clientLastName.trim(),
        token: response?.result?.token || '',
      });

      navigate('/wallet-activation');
    } catch (err) {
      console.error('[Onboarding] precreateWallet failed:', err);
      setSubmitError(
        err.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Count filled fields for progress
  const totalRequired = FIELD_SECTIONS.reduce(
    (sum, s) => sum + s.fields.filter((f) => f.required).length,
    0
  );
  const filledRequired = FIELD_SECTIONS.reduce(
    (sum, s) =>
      sum + s.fields.filter((f) => f.required && form[f.name]?.trim()).length,
    0
  );
  const progressPct = totalRequired > 0 ? (filledRequired / totalRequired) * 100 : 0;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ─── Sticky header ──────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-surface-100">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-3">
          <img src="/logo.png" alt="MindSave" className="w-10 h-10 rounded-xl object-contain flex-shrink-0" />
          <span className="text-base font-bold text-surface-900 tracking-tight">MindSave</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-surface-100">
          <div
            className="h-full bg-gradient-primary transition-all duration-500 ease-out rounded-r-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ─── Content ──────────────────────────────── */}
      <div className="max-w-lg mx-auto px-5 py-6">
        {/* Title section */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight leading-tight">
            Set up your Aura wallet
          </h1>
          <p className="text-sm text-surface-500 mt-2 leading-relaxed">
            Start with your basic information so Aura can personalize your
            savings experience.
          </p>
        </div>

        {/* ─── Trust badges ──────────────────────────── */}
        <div className="flex items-center gap-4 mb-7 px-1">
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success-500">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-medium">Secure</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="font-medium">Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="font-medium">Regulated</span>
          </div>
        </div>

        {/* ─── Form ──────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          {FIELD_SECTIONS.map((section, sIdx) => (
            <div key={section.title} className={sIdx > 0 ? 'mt-7' : ''}>
              <h2 className="section-title mb-4">{section.title}</h2>
              <div className="card p-4 space-y-4">
                {section.fields.map((field) => {
                  if (field.name === 'phoneNumber') {
                    return (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">
                          {field.label} <span className="text-danger-400 ml-0.5">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            name="countryCode"
                            value={form.countryCode}
                            onChange={handleChange}
                            className="w-[110px] px-3.5 py-2.5 text-sm rounded-xl border bg-white outline-none border-surface-200 text-surface-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          >
                            <option value="212">+212 (MA)</option>
                            <option value="33">+33 (FR)</option>
                            <option value="1">+1 (US/CA)</option>
                            <option value="44">+44 (UK)</option>
                            <option value="34">+34 (ES)</option>
                            <option value="971">+971 (AE)</option>
                          </select>
                          <div className="flex-1">
                            <input
                              name="phoneNumber"
                              type="tel"
                              value={form.phoneNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                handleChange({ target: { name: 'phoneNumber', value: val } });
                              }}
                              onBlur={handleBlur}
                              placeholder="612345678"
                              maxLength={9}
                              autoComplete="tel-national"
                              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white outline-none transition-all duration-200 placeholder:text-surface-300 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${errors.phoneNumber && touched.phoneNumber ? 'border-danger-400 bg-danger-50/30' : 'border-surface-200 hover:border-surface-300'} text-surface-900`}
                            />
                          </div>
                        </div>
                        {errors.phoneNumber && touched.phoneNumber && (
                          <p className="mt-1 text-xs text-danger-500 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            {errors.phoneNumber}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <FormField
                      key={field.name}
                      field={field}
                      value={form[field.name]}
                      error={errors[field.name]}
                      touched={touched[field.name]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submit error */}
          {submitError && (
            <div className="mt-5 p-3.5 rounded-xl bg-danger-50 border border-danger-100 text-sm text-danger-600 flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="mt-7 pb-10">
            <PrimaryButton
              type="submit"
              fullWidth
              loading={submitting}
              size="lg"
            >
              Continue
            </PrimaryButton>
            <p className="text-center text-xs text-surface-400 mt-3 leading-relaxed">
              By continuing, you agree to Aura&apos;s{' '}
              <span className="text-primary-600 font-medium">Terms of Service</span>
              {' '}and{' '}
              <span className="text-primary-600 font-medium">Privacy Policy</span>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
