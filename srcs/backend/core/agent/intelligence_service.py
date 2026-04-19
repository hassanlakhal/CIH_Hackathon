"""
Intelligence Service — MindSave Financial Coaching Engine
=========================================================
Uses Groq (Llama 3.3 70B) to analyze transaction history and provide
safe savings recommendations, goal forecasts, and financial insights.

This file is a self-contained module encompassing data parsing,
MCC mapping, and the core AI financial intelligence logic.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Optional

import pandas as pd
import requests
from groq import Groq

logger = logging.getLogger(__name__)

# ── Groq Constants ────────────────────────────────────────────────────────────

_GROQ_MODEL = "openai/gpt-oss-120b"
_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ── PII field names to strip from any dict before AI processing ──────────────
_PII_FIELDS: frozenset[str] = frozenset({
    "beneficiaryFirstName", "beneficiaryLastName",
    "firstName", "lastName",
    "tierFirstName", "tierLastName",
    "first_name", "last_name",
    "phoneNumber", "mobileNumber", "phone_number",
    "email", "addressLine1", "addressLine2",
    "clientFirstName", "clientLastName",
    "benFirstName", "benLastName",
    "DestinationFirstName", "DestinationLastName",
    "NumBeneficiaire", "BeneficiaryPhoneNumber",
})

# ── Transaction type codes → human labels ─────────────────────────────────────
_TX_TYPE_LABELS: dict[str, str] = {
    "CI":  "Cash In",
    "CO":  "Cash Out",
    "MMD": "Wallet Transfer",
    "TM":  "Merchant Payment",
    "CC":  "Merchant-to-Merchant",
    "MW":  "Merchant to Wallet",
    "TT":  "Bank Transfer",
    "GAB": "ATM Withdrawal",
    "QR":  "QR Payment",
}

# ── MCC Code → Category Mapping ───────────────────────────────────────────────
_MCC_CATEGORY_MAP: dict[str, str] = {
    "5411": "Grocery Stores & Supermarkets", "5422": "Meat & Poultry Stores",
    "5441": "Candy, Nut & Confectionery", "5451": "Dairy Products",
    "5462": "Bakeries", "5499": "Misc. Food Stores",
    "5912": "Drug Stores & Pharmacies", "5812": "Eating Places & Restaurants",
    "5813": "Drinking Places & Bars", "5814": "Fast Food Restaurants",
    "5541": "Service Stations / Gas", "5542": "Automated Fuel Dispensers",
    "7523": "Parking Lots & Garages", "7531": "Auto Body Repair",
    "7549": "Towing Services", "5511": "Car Dealers (New)",
    "5521": "Car Dealers (Used)", "4011": "Railroads",
    "4111": "Local Transit & Commuter", "4121": "Taxicabs & Limousines",
    "4131": "Bus Lines", "4511": "Airlines", "4722": "Travel Agencies",
    "7011": "Hotels & Motels", "4812": "Telecom / Phone Services",
    "4814": "Telecommunication Services", "4900": "Utilities (Electric, Gas…)",
    "5122": "Drugs & Drug Proprietaries", "8011": "Doctors & Physicians",
    "8021": "Dentists", "8049": "Chiropractors & Therapists",
    "8062": "Hospitals", "8099": "Medical Services",
    "8211": "Schools & Elementary", "8220": "Colleges & Universities",
    "8299": "School & Educational", "7832": "Motion Picture Theaters",
    "7941": "Sports Clubs / Stadiums", "7992": "Golf Courses",
    "7993": "Video Games & Arcades", "7999": "Recreation Services",
    "5300": "Wholesale Clubs", "5310": "Discount Stores",
    "5311": "Department Stores", "5331": "Variety Stores",
    "5399": "Misc. General Merchandise", "5600": "Clothing Stores",
    "5621": "Ladies' Clothing", "5631": "Ladies' Accessories",
    "5651": "Family Clothing", "5661": "Shoe Stores",
    "5691": "Men's/Women's Clothing", "5712": "Furniture Stores",
    "5732": "Electronics Stores", "5734": "Computer Stores",
    "5944": "Jewelry Stores", "5945": "Hobby & Toy Stores",
    "5999": "Misc. Retail Stores", "6010": "Financial Institutions (Cash)",
    "6011": "ATM Withdrawals", "6012": "Banks",
    "6051": "Currency Exchange", "6300": "Insurance",
    "7372": "IT Services", "7374": "Data Processing",
    "8000": "Health & Education Misc.", "8742": "Management Consulting",
    "5251": "Hardware Stores", "5261": "Lawn & Garden",
    "1711": "Plumbing & AC", "1731": "Electrical Work",
    "1750": "Carpentry", "4816": "Computer Network Services",
    "6536": "Mobile Wallet Payments", "6537": "Mobile Wallet Transfer",
}

def get_mcc_category(mcc_code: str) -> str:
    return _MCC_CATEGORY_MAP.get(str(mcc_code).strip(), "Other / Miscellaneous")

# ── System Instruction (User provided) ─────────────────────────────────────────

_SYSTEM_INSTRUCTION = """\
You are the financial intelligence engine of MindSave, an invisible banking assistant for students.

Your role:
Analyze a user's wallet transaction history and estimate how much money is safe to save automatically, while preserving a safety floor and helping the user reach a savings goal.

You are not a chatbot here.
You are a structured financial analysis engine.
Your output must always be a valid JSON object only.

-----------------------------------
CORE ANALYSIS RULES
-----------------------------------

1. Detect salary / main income
- If a credit/income transaction appears every month with the same amount and approximately the same date, consider it fixed income.
- The strongest repeating fixed income should be treated as the user's salary or main monthly income.
- If there are multiple repeating fixed income sources, classify them as recurring incomes.

2. Detect fixed charges
- If a debit/expense transaction appears every month with the same amount and approximately the same date, consider it a fixed recurring charge.
- Group such transactions into recurring fixed expenses.

3. Detect variable expenses
- Transactions that do not repeat with stable amount and stable timing should be considered variable expenses.
- These are less predictable and less “fixed” than recurring expenses.

4. Estimate monthly financial structure
Based on the transaction history, estimate:
- average monthly recurring income
- average monthly recurring fixed expenses
- average monthly variable expenses
- average monthly net disposable amount

5. Safety floor rule
The safety floor is mandatory. Preserve that minimum balance.

6. Free money interval
Estimate the amount range that can be considered “free” after accounting for flow and safety floor.

7. Safe savings recommendation
Estimate how much of the free money can safely be moved to the safe wallet.
Conservative logic: around 20% of the estimated free/variable money.

8. Goal achievement forecast
Estimate how long it will take for the user to reach the goal amount.

9. Currency Rule
All amounts are in Moroccan Dirham (MAD). 
You MUST use "MAD" as the currency symbol/label in your insights and warnings.
NEVER use "USD" or "$".
If you see a $ symbol, assume it is MAD.

-----------------------------------
OUTPUT REQUIREMENTS
-----------------------------------

Return ONLY a valid JSON object matching this strict schema:
{
  "incomeAnalysis": {
    "totalRecurringIncome": 0,
    "estimatedIncomeThisMonth": 0,
    "incomeSources": { "Salary": 5000, "Freelance": 1000 }
  },
  "expenseAnalysis": {
    "totalEstimatedMonthlyExpenses": 0,
    "estimatedExpensesThisMonth": 0,
    "expenseCategories": { "Rent": 2000, "Groceries": 500, "Dining": 300 },
    "necessaryExpenses": { "Rent": 2000, "Electricity": 200 },
    "optionalExpenses": { "Netflix": 100, "Coffee": 50 }
  },
  "safetyAnalysis": {
    "estimatedFreeMonthlyAmount": 0,
    "safetyFloorRecommendation": 1000
  },
  "savingsRecommendation": {
    "recommendedSavingsAmountMonthly": 0,
    "recommendedSavingsRate": 20
  },
  "goalForecast": {
    "estimatedMonthsToGoal": 3,
    "predictedGoalCompletionDate": "YYYY-MM-DD",
    "goalOnTrack": true
  },
  "insights": ["Overall summary of financial health", "Actionable short tip"],
  "warnings": ["Potential risk if current spending continues"],
  "savingOpportunities": [
    { "description": "Reduce dining out", "potentialSavings": 200 }
  ],
  "summary": {
    "confidenceScore": 85,
    "financialStability": "stable"
  }
}

IMPORTANT: Even if transaction history is short, extrapolate current trends (e.g., daily spend rate) to provide best-guess estimates rather than zeros.
"""

@dataclass
class ParsedWalletData:
    balance_mad: float
    transactions_df: pd.DataFrame
    daily_burn_rate: float
    top_categories: list[dict[str, Any]]
    upcoming_events: list[dict[str, Any]]
    summary_stats: dict[str, Any]
    errors: list[str] = field(default_factory=list)

@dataclass
class IntelligentInsight:
    raw_json: dict[str, Any]
    
    @property
    def health_score(self) -> int:
        return self.raw_json.get("summary", {}).get("confidenceScore", 0)

    @property
    def recommended_savings(self) -> float:
        return float(self.raw_json.get("savingsRecommendation", {}).get("recommendedSavingsAmountMonthly", 0.0))

# ── Data Parsing Helpers ──────────────────────────────────────────────────────

def _moroccan_float(value: Any) -> float:
    if value is None: return 0.0
    text = str(value).replace(" ", "").replace(",", ".")
    text = re.sub(r"[^\d.\-]", "", text)
    try: return float(text)
    except ValueError: return 0.0

def _strip_pii(record: dict) -> dict:
    return {k: v for k, v in record.items() if k not in _PII_FIELDS}

def _parse_date(raw: str) -> datetime | None:
    for fmt in ("%m/%d/%Y %I:%M:%S %p", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try: return datetime.strptime(raw.strip(), fmt)
        except (ValueError, AttributeError): continue
    return None

def fetch_wallet_data(contract_id: str, base_url: str = "http://localhost:22222") -> ParsedWalletData:
    errors: list[str] = []
    
    # ── 1. Balance ────────────────────────────────────────────────────────
    balance = 0.0
    try:
        resp = requests.get(f"{base_url}/api/wallet/balance", params={"contractid": contract_id}, timeout=10)
        resp.raise_for_status()
        balance = _moroccan_float(resp.json()["result"]["balance"][0]["value"])
    except Exception as e:
        errors.append(f"Balance error: {e}")

    # ── 2. Operations ─────────────────────────────────────────────────────
    operations = []
    try:
        resp = requests.get(f"{base_url}/api/wallet/operations", params={"contractid": contract_id}, timeout=10)
        resp.raise_for_status()
        operations = resp.json().get("result", [])
    except Exception as e:
        errors.append(f"Ops error: {e}")

    # ── 3. Build & Process DataFrame ──────────────────────────────────────
    rows = []
    for op in operations:
        op = _strip_pii(op)
        amt = _moroccan_float(op.get("amount", 0))
        tx_code = op.get("type", "")
        direction = "credit" if tx_code in {"CI", "MW"} else "debit"
        mcc = str(op.get("MCC") or op.get("mcc") or "")
        
        rows.append({
            "date": _parse_date(op.get("date", "")),
            "tx_type": tx_code,
            "tx_label": _TX_TYPE_LABELS.get(tx_code, tx_code or "Unknown"),
            "amount": amt,
            "direction": direction,
            "mcc": mcc,
            "category_en": get_mcc_category(mcc) if mcc else "Unknown",
        })

    df = pd.DataFrame(rows)
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.sort_values("date", ascending=False).reset_index(drop=True)

    # ── 4. Stats ──────────────────────────────────────────────────────────
    total_debit = float(df[df["direction"] == "debit"]["amount"].sum()) if not df.empty else 0.0
    window_days = max((df["date"].max() - df["date"].min()).days, 1) if not df.empty and len(df) > 1 else 1
    daily_burn = total_debit / window_days

    top_cats = []
    if not df.empty:
        cats = df[df["direction"] == "debit"].groupby("category_en")["amount"].sum().sort_values(ascending=False).head(5)
        top_cats = [{"category": c, "total_mad": round(float(a), 2)} for c, a in cats.items()]

    return ParsedWalletData(
        balance_mad=balance,
        transactions_df=df,
        daily_burn_rate=daily_burn,
        top_categories=top_cats,
        upcoming_events=[], # Simplified for now
        summary_stats={"balance_mad": balance, "total_debit": total_debit, "daily_burn": daily_burn},
        errors=errors
    )

# ── Intelligence Logic ────────────────────────────────────────────────────────

def generate_financial_intelligence(
    wallet_data: ParsedWalletData,
    safety_floor: float,
    goal_amount: float,
    current_saved: float = 0.0
) -> IntelligentInsight:
    if not _GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set.")

    client = Groq(api_key=_GROQ_API_KEY)
    transactions = wallet_data.transactions_df.to_dict(orient="records")
    cleaned_tx = []
    for tx in transactions:
        tx_copy = tx.copy()
        for k, v in tx_copy.items():
            if isinstance(v, (date, datetime, pd.Timestamp)):
                 tx_copy[k] = v.isoformat() if hasattr(v, "isoformat") else str(v)
            elif v is None:
                 tx_copy[k] = ""
        cleaned_tx.append(tx_copy)

    input_data = {
        "transactions": cleaned_tx,
        "safety_floor": safety_floor,
        "goal_amount": goal_amount,
        "current_balance": wallet_data.balance_mad,
        "current_saved_amount": current_saved,
    }

    try:
        response = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_INSTRUCTION},
                {"role": "user", "content": f"Analyze transactions and return JSON:\n\n{json.dumps(input_data, indent=2)}"},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        return IntelligentInsight(raw_json=json.loads(response.choices[0].message.content))
    except Exception as exc:
        logger.error("[intelligence_service] Groq error: %s", exc)
        raise RuntimeError(f"Intelligence Engine error: {exc}") from exc
