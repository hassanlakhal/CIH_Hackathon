import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSurvey, submitSurvey } from '../../services/walletService.js';
import { getStoredUserIdentity } from '../../utils/userIdentity.js';
import PrimaryButton from '../ui/PrimaryButton.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import LoadingState from '../ui/LoadingState.jsx';

// ─── Subcomponents ─────────────────────────────────────────────────────────

function SurveyProgressBar({ currentStep, totalSteps }) {
  const percentage = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="w-full bg-surface-100 h-1.5 overflow-hidden">
      <div 
        className="h-full bg-gradient-primary transition-all duration-300 ease-out" 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function SurveyInputCard({ label, description, icon, value, onChange }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary-50 text-xl flex items-center justify-center border border-primary-100 flex-shrink-0">
          {icon}
        </div>
        <div>
          <label className="block font-semibold text-surface-900 leading-tight">
            {label}
          </label>
          {description && (
            <p className="text-xs text-surface-500 mt-0.5 leading-relaxed pr-2">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          min="0"
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            onChange(isNaN(num) ? 0 : num);
          }}
          placeholder="e.g. 1200"
          className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-4 pr-12 py-3.5 text-lg font-bold text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-shadow appearance-none"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 font-semibold text-sm">
          MAD
        </span>
      </div>
    </div>
  );
}

function SurveyStep({ title, subtitle, icon, children }) {
  return (
    <div className="animate-fade-in w-full pb-20">
      <div className="text-center mb-8 mt-4 px-4">
        <div className="w-16 h-16 bg-surface-50 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-sm border border-surface-100">
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-surface-900 tracking-tight leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-surface-500 mt-2 max-w-[260px] mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="space-y-4 px-4">
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SurveyPage() {
  const navigate = useNavigate();
  const identity = getStoredUserIdentity();
  const phoneNumber = identity?.phoneNumber;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [surveyData, setSurveyData] = useState({
    phoneNumber: phoneNumber || '',
    digitalPlatforms: 0,
    rent: 0,
    groceries: 0,
    utilities: 0,
    entertainment: 0,
    transportation: 0,
    emergency_fund: 0,
    vacation: 0,
    education: 0,
    retirement: 0,
    investment: 0,
    debt_repayment: 0
  });

  useEffect(() => {
    if (!phoneNumber) {
      setError("No registered phone number found. Please sign up first.");
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const res = await getSurvey(phoneNumber);
        // "if isSurveyNeed = true: prefill values allow user to update... if false: start empty"
        // Wait, normally if false they wouldn't need it. But per prompt: "if false: start empty survey"
        // Note: The prompt means if they already filled it, we could prefill it. If it returns data, we prefil.
        // The exact prompt says: "if isSurveyNeed = true: prefill values allow user to update. if false: start empty"
        if (res?.isSurveyNeed === true && res?.data) {
          setSurveyData(prev => ({
            ...prev,
            ...res.data,
            phoneNumber
          }));
        }
      } catch (err) {
        // If it throws (e.g. 404 because not found), just start empty
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [phoneNumber]);

  const handleUpdate = (field, value) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitSurvey(surveyData);
      setCompleted(true);
    } catch (err) {
      setError(err.message || "Failed to save your survey.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col pt-12 items-center">
        <LoadingState message="Preparing your personalized setup..." />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-dvh bg-surface-50 flex flex-col justify-center items-center px-5 animate-fade-in text-center">
        <div className="w-24 h-24 bg-success-50 rounded-full flex items-center justify-center text-5xl mb-6 border-8 border-white shadow-sm ring-1 ring-surface-200">
          ✨
        </div>
        <h2 className="text-2xl font-bold text-surface-900 mb-2">You're all set!</h2>
        <p className="text-surface-500 max-w-xs leading-relaxed mb-8">
          MindSave will now optimize your savings based on your unique goals and lifestyle.
        </p>
        <PrimaryButton fullWidth onClick={() => navigate('/')}>
          Go to Dashboard
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface-50 flex flex-col relative overflow-hidden">
      {/* Fixed top progress bar */}
      <div className="fixed top-0 inset-x-0 z-50">
        <SurveyProgressBar currentStep={step} totalSteps={totalSteps} />
      </div>

      <div className="flex-1 overflow-y-auto pb-24 pt-8">
        {error && !completed && (
          <div className="mx-4 mb-4 bg-danger-50 border border-danger-200 text-danger-700 p-3 rounded-xl text-sm font-semibold flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-danger-500 hover:text-danger-800 p-1">✕</button>
          </div>
        )}

        {/* ─── Step 1: Essentials ───────────────────────────────────────── */}
        {step === 1 && (
          <SurveyStep 
            title="Essential Expenses" 
            subtitle="Let's start with your core monthly living costs"
            icon="🏠"
          >
            <SurveyInputCard
              label="Rent or Mortgage"
              description="Your primary housing cost"
              icon="🔑"
              value={surveyData.rent}
              onChange={(val) => handleUpdate('rent', val)}
            />
            <SurveyInputCard
              label="Groceries"
              description="Average monthly food shopping"
              icon="🛒"
              value={surveyData.groceries}
              onChange={(val) => handleUpdate('groceries', val)}
            />
            <SurveyInputCard
              label="Utilities"
              description="Water, electricity, internet"
              icon="⚡"
              value={surveyData.utilities}
              onChange={(val) => handleUpdate('utilities', val)}
            />
             <SurveyInputCard
              label="Transportation"
              description="Gas, public transit, rideshares"
              icon="🚌"
              value={surveyData.transportation}
              onChange={(val) => handleUpdate('transportation', val)}
            />
          </SurveyStep>
        )}

        {/* ─── Step 2: Lifestyle ───────────────────────────────────────── */}
        {step === 2 && (
          <SurveyStep 
            title="Lifestyle" 
            subtitle="Your digital life and entertainment budget"
            icon="🍿"
          >
            <SurveyInputCard
              label="Digital Platforms"
              description="Streaming, subscriptions, apps"
              icon="📱"
              value={surveyData.digitalPlatforms}
              onChange={(val) => handleUpdate('digitalPlatforms', val)}
            />
            <SurveyInputCard
              label="Entertainment"
              description="Dining out, movies, hobbies"
              icon="✨"
              value={surveyData.entertainment}
              onChange={(val) => handleUpdate('entertainment', val)}
            />
          </SurveyStep>
        )}

        {/* ─── Step 3: Goals & Future ───────────────────────────────────────── */}
        {step === 3 && (
          <SurveyStep 
            title="Future Goals" 
            subtitle="What are you saving for?"
            icon="🎯"
          >
            <SurveyInputCard
              label="Emergency Fund"
              description="Money you want to set aside for emergencies"
              icon="🛡️"
              value={surveyData.emergency_fund}
              onChange={(val) => handleUpdate('emergency_fund', val)}
            />
            <SurveyInputCard
              label="Vacation"
              description="Saving for your next trip"
              icon="✈️"
              value={surveyData.vacation}
              onChange={(val) => handleUpdate('vacation', val)}
            />
            <SurveyInputCard
              label="Education"
              description="Tuition, courses, learning"
              icon="📚"
              value={surveyData.education}
              onChange={(val) => handleUpdate('education', val)}
            />
             <SurveyInputCard
              label="Retirement"
              description="Long-term nest egg"
              icon="🌴"
              value={surveyData.retirement}
              onChange={(val) => handleUpdate('retirement', val)}
            />
            <SurveyInputCard
              label="Investments"
              description="Stocks, crypto, real estate"
              icon="📈"
              value={surveyData.investment}
              onChange={(val) => handleUpdate('investment', val)}
            />
          </SurveyStep>
        )}

        {/* ─── Step 4: Obligations ───────────────────────────────────────── */}
        {step === 4 && (
          <SurveyStep 
            title="Financial Obligations" 
            subtitle="Outstanding loans or debts"
            icon="💳"
          >
            <SurveyInputCard
              label="Debt Repayment"
              description="Monthly payments for student loans, credit cards, etc"
              icon="🧾"
              value={surveyData.debt_repayment}
              onChange={(val) => handleUpdate('debt_repayment', val)}
            />
          </SurveyStep>
        )}

        {/* ─── Step 5: Summary ───────────────────────────────────────── */}
        {step === 5 && (
          <SurveyStep 
            title="Review your profile" 
            subtitle="Your financial blueprint is ready."
            icon="📋"
          >
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
              {[
                { label: 'Rent', value: surveyData.rent },
                { label: 'Groceries', value: surveyData.groceries },
                { label: 'Transport', value: surveyData.transportation },
                { label: 'Utilities', value: surveyData.utilities },
                { label: 'Digital', value: surveyData.digitalPlatforms },
                { label: 'Entertainment', value: surveyData.entertainment },
                { label: 'Emergency', value: surveyData.emergency_fund },
                { label: 'Vacation', value: surveyData.vacation },
                { label: 'Education', value: surveyData.education },
                { label: 'Retirement', value: surveyData.retirement },
                { label: 'Investments', value: surveyData.investment },
                { label: 'Debt', value: surveyData.debt_repayment },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center px-5 py-3 border-b border-surface-100 last:border-0 hover:bg-surface-50 cursor-pointer" onClick={() => setStep(Math.floor(idx/4)+1)}>
                  <span className="text-surface-600 font-medium text-sm">{item.label}</span>
                  <span className="font-bold text-surface-900">{item.value > 0 ? `${item.value} MAD` : '—'}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-surface-500 mt-4 px-4 leading-relaxed">
              MindSave uses this data to calculate your personalized Safe-to-Save limits automatically. It is never shared.
            </p>
          </SurveyStep>
        )}
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 inset-x-0 p-4 pb-safe bg-white border-t border-surface-200 z-50">
        <div className="flex gap-3 max-w-sm mx-auto">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={submitting}
              className="px-6 py-3.5 rounded-xl font-bold text-surface-600 bg-surface-100 hover:bg-surface-200 active:bg-surface-300 transition-colors"
            >
              Back
            </button>
          )}
          
          <PrimaryButton
            fullWidth
            onClick={step === totalSteps ? handleSubmit : handleNext}
            loading={submitting}
            className="flex-1"
          >
            {step === totalSteps ? 'Save Profile' : 'Continue'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
