"""
Data Parser — Smart Savings Calendar
======================================
Fetches raw JSON from the CIH Wallet API, cleanses it, handles
Moroccan number formatting, maps MCC codes to categories, and
strips all PII before the data is sent to the Gemini AI layer.

Public API:
    fetch_wallet_data(contract_id, base_url)  →  ParsedWalletData
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import pandas as pd
import requests

from .mcc_mapping import get_category

logger = logging.getLogger(__name__)

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


# ── Data container ─────────────────────────────────────────────────────────────

@dataclass
class ParsedWalletData:
    """Container returned by fetch_wallet_data()."""
    balance_mad: float                        # Current balance in MAD
    transactions_df: pd.DataFrame             # PII-free, cleaned transaction table
    daily_burn_rate: float                    # Average daily spend (debit only)
    top_categories: list[dict[str, Any]]      # Top-5 spending categories
    upcoming_events: list[dict[str, Any]]     # Recurring predictions based on 30-day activity
    summary_stats: dict[str, Any]             # High-level numeric summary
    errors: list[str] = field(default_factory=list)  # Non-fatal fetch errors


# ── Helpers ────────────────────────────────────────────────────────────────────

def _moroccan_float(value: Any) -> float:
    """
    Parse a Moroccan-formatted number string to float.
    Replaces comma decimal separators with dots (e.g. '12 556,88' → 12556.88).
    """
    if value is None:
        return 0.0
    text = str(value).replace(" ", "").replace(",", ".")
    # Remove any currency suffix (e.g. 'MAD')
    text = re.sub(r"[^\d.\-]", "", text)
    try:
        return float(text)
    except ValueError:
        return 0.0


def _strip_pii(record: dict) -> dict:
    """Return a copy of *record* with all PII keys removed."""
    return {k: v for k, v in record.items() if k not in _PII_FIELDS}


def _parse_date(raw: str) -> datetime | None:
    """
    Parse CIH API date strings.
    Handles formats like '04/18/2026 12:30:00 PM'.
    """
    for fmt in (
        "%m/%d/%Y %I:%M:%S %p",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y",
    ):
        try:
            return datetime.strptime(raw.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


# ── Fetchers ───────────────────────────────────────────────────────────────────

def _fetch_balance(contract_id: str, base_url: str, timeout: int = 10) -> tuple[float, str | None]:
    """
    GET /api/wallet/balance?contractid={contract_id}
    Returns (balance_float, error_message_or_None).
    """
    try:
        url = f"{base_url}/api/wallet/balance"
        resp = requests.get(url, params={"contractid": contract_id}, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        raw_value = data["result"]["balance"][0]["value"]
        return _moroccan_float(raw_value), None
    except requests.RequestException as exc:
        logger.warning("[parser] Balance fetch failed: %s", exc)
        return 0.0, f"Balance fetch error: {exc}"
    except (KeyError, IndexError, TypeError) as exc:
        logger.warning("[parser] Balance parse failed: %s", exc)
        return 0.0, f"Balance parse error: {exc}"


def _fetch_operations(contract_id: str, base_url: str, timeout: int = 10) -> tuple[list[dict], str | None]:
    """
    GET /api/wallet/operations?contractid={contract_id}
    Returns (list_of_operations, error_or_None).
    """
    try:
        url = f"{base_url}/api/wallet/operations"
        resp = requests.get(url, params={"contractid": contract_id}, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        ops = data.get("result", [])
        if not isinstance(ops, list):
            return [], "Unexpected operations format"
        return ops, None
    except requests.RequestException as exc:
        logger.warning("[parser] Operations fetch failed: %s", exc)
        return [], f"Operations fetch error: {exc}"
    except (KeyError, TypeError) as exc:
        logger.warning("[parser] Operations parse failed: %s", exc)
        return [], f"Operations parse error: {exc}"


def _fetch_merchant_mcc(contract_id: str, base_url: str, timeout: int = 10) -> tuple[str | None, str | None]:
    """
    POST /api/wallet/merchant/simulate
    Returns (mcc_code_or_None, error_or_None).

    Note: The simulate endpoint returns an MCC to enrich transaction categorisation.
    It is called once per session to get the primary merchant MCC context.
    """
    try:
        url = f"{base_url}/api/wallet/merchant/simulate"
        payload = {"contractId": contract_id}
        resp = requests.post(url, json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        mcc = (
            data.get("result", {}).get("MCC")
            or data.get("result", {}).get("mcc")
            or data.get("MCC")
            or data.get("mcc")
        )
        return str(mcc) if mcc else None, None
    except requests.RequestException as exc:
        # Non-fatal: endpoint may not exist in all environments
        logger.info("[parser] Merchant simulate not available: %s", exc)
        return None, None
    except (KeyError, TypeError) as exc:
        logger.info("[parser] Merchant simulate parse issue: %s", exc)
        return None, None


# ── Transaction DataFrame builder ──────────────────────────────────────────────

def _build_transactions_df(operations: list[dict], default_mcc: str | None = None) -> pd.DataFrame:
    """
    Convert a list of raw operation dicts to a clean Pandas DataFrame.

    Columns produced:
        date, tx_type, tx_label, amount, fees, total_amount,
        currency, direction, mcc, category_en, category_ar,
        status, reference_id, is_canceled
    """
    if not operations:
        return pd.DataFrame()

    rows = []
    for op in operations:
        op = _strip_pii(op)

        # ── Amount & fees ──────────────────────────────────────────────────
        amount       = _moroccan_float(op.get("amount", 0))
        fees         = _moroccan_float(op.get("Fees", op.get("fees", 0)))
        total_amount = _moroccan_float(op.get("totalAmount", amount))

        # ── Direction (debit / credit) ─────────────────────────────────────
        tx_type_code = op.get("type", "")
        # Credit types: Cash In, Merchant-to-Wallet, Wallet receives transfer
        credit_types = {"CI", "MW"}
        direction = "credit" if tx_type_code in credit_types else "debit"

        # ── MCC & category ────────────────────────────────────────────────
        mcc = str(op.get("MCC") or op.get("mcc") or default_mcc or "")
        cat_en = get_category(mcc) if mcc else "Unknown"

        # ── Date ──────────────────────────────────────────────────────────
        raw_date = op.get("date", "")
        parsed_date = _parse_date(raw_date) if raw_date else None

        rows.append({
            "date":         parsed_date,
            "tx_type":      tx_type_code,
            "tx_label":     _TX_TYPE_LABELS.get(tx_type_code, tx_type_code or "Unknown"),
            "amount":       amount,
            "fees":         fees,
            "total_amount": total_amount,
            "currency":     op.get("currency", "MAD"),
            "direction":    direction,
            "mcc":          mcc,
            "category_en":  cat_en,
            "status":       op.get("status", ""),
            "reference_id": op.get("referenceId", ""),
            "is_canceled":  bool(op.get("isCanceled", False)),
        })

    df = pd.DataFrame(rows)

    # ── Date-based enrichments ────────────────────────────────────────────
    if not df.empty and "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["day_of_week"] = df["date"].dt.day_name()
        df["week_number"] = df["date"].dt.isocalendar().week.astype("Int64")
        df = df.sort_values("date", ascending=False).reset_index(drop=True)

    return df


# ── Recurring Events Engine ───────────────────────────────────────────────────

def _detect_recurring_events(df: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Scan the last 30 days of transactions for recurring patterns.
    Any merchant/category hit >1 time is flagged as a potential recurring event
    expected in the upcoming month.
    """
    if df.empty or "date" not in df.columns:
        return []

    # Focus purely on debit operations within the last 30 days
    recent = df[(df["direction"] == "debit") & (df["tx_type"].isin(["TM", "TT", "MMD"]))].copy()
    if recent.empty:
        return []
        
    recent["date"] = pd.to_datetime(recent["date"])
    cutoff = recent["date"].max() - pd.Timedelta(days=30)
    window = recent[recent["date"] >= cutoff]

    if window.empty:
        return []

    # Look for merchants/categories billed multiple times
    events = []
    freq = window.groupby(["category_en", "tx_label"]).agg(
        hits=("amount", "count"),
        avg_spend=("amount", "mean"),
        last_date=("date", "max")
    ).reset_index()

    recurring = freq[freq["hits"] > 1]
    
    for _, row in recurring.iterrows():
        events.append({
            "event_type": row["category_en"],
            "expected_label": row["tx_label"],
            "approximate_amount_mad": round(row["avg_spend"], 2),
            "historical_hits_last_30d": int(row["hits"]),
            "last_paid": row["last_date"].strftime("%Y-%m-%d") if pd.notnull(row["last_date"]) else None,
        })
        
    return sorted(events, key=lambda x: x["approximate_amount_mad"], reverse=True)


# ── Statistics builder ─────────────────────────────────────────────────────────

def _compute_stats(df: pd.DataFrame, balance: float) -> tuple[float, list[dict], dict]:
    """
    Derive:
      - daily_burn_rate  : average daily debit spend
      - top_categories   : top-5 spending buckets
      - summary_stats    : dict with numeric headline figures
    """
    if df.empty:
        return 0.0, [], {
            "balance_mad": balance,
            "total_transactions": 0,
            "total_debits_mad": 0.0,
            "total_credits_mad": 0.0,
            "net_flow_mad": 0.0,
            "avg_tx_amount_mad": 0.0,
            "daily_burn_rate_mad": 0.0,
            "days_of_runway": None,
            "unique_categories": 0,
            "analysis_window_days": 0,
        }

    debits  = df[df["direction"] == "debit"]
    credits = df[df["direction"] == "credit"]

    total_debit  = float(debits["amount"].sum())
    total_credit = float(credits["amount"].sum())

    # Daily burn rate over the observed window
    valid_dates = df["date"].dropna()
    if len(valid_dates) >= 2:
        window_days = max((valid_dates.max() - valid_dates.min()).days, 1)
    else:
        window_days = 1

    daily_burn = total_debit / window_days if window_days > 0 else 0.0

    # Days of runway at current burn rate
    runway = round(balance / daily_burn, 1) if daily_burn > 0 else None

    # Top-5 spending categories
    if not debits.empty:
        cat_totals = (
            debits.groupby("category_en")["amount"]
            .sum()
            .sort_values(ascending=False)
            .head(5)
        )
        top_cats = [
            {"category": cat, "total_mad": round(float(amt), 2)}
            for cat, amt in cat_totals.items()
        ]
    else:
        top_cats = []

    summary = {
        "balance_mad":          round(balance, 2),
        "total_transactions":   len(df),
        "total_debits_mad":     round(total_debit, 2),
        "total_credits_mad":    round(total_credit, 2),
        "net_flow_mad":         round(total_credit - total_debit, 2),
        "avg_tx_amount_mad":    round(float(df["amount"].mean()), 2),
        "daily_burn_rate_mad":  round(daily_burn, 2),
        "days_of_runway":       runway,
        "unique_categories":    int(df["category_en"].nunique()),
        "analysis_window_days": window_days,
    }

    return daily_burn, top_cats, summary


# ── Public entry point ─────────────────────────────────────────────────────────

def fetch_wallet_data(contract_id: str, base_url: str = "http://localhost:8000") -> ParsedWalletData:
    """
    Orchestrate all three data fetches, parse them, and return a
    clean ParsedWalletData ready for the Gemini service.

    Args:
        contract_id : The wallet contract ID (e.g. 'LAN814819513542345').
        base_url    : Root URL of the CIH mock API server.

    Returns:
        ParsedWalletData with balance, clean DataFrame, stats, and any errors.
    """
    errors: list[str] = []

    # ── 1. Balance ────────────────────────────────────────────────────────
    balance, err = _fetch_balance(contract_id, base_url)
    if err:
        errors.append(err)

    # ── 2. Transaction history ────────────────────────────────────────────
    operations, err = _fetch_operations(contract_id, base_url)
    if err:
        errors.append(err)

    # ── 3. Merchant MCC (best-effort) ─────────────────────────────────────
    default_mcc, err = _fetch_merchant_mcc(contract_id, base_url)
    if err:
        errors.append(err)

    # ── 4. Build DataFrame ────────────────────────────────────────────────
    df = _build_transactions_df(operations, default_mcc)

    # ── 5. Compute stats ──────────────────────────────────────────────────
    daily_burn, top_cats, summary = _compute_stats(df, balance)
    
    # ── 6. Predict Upcoming Events ─────────────────────────────────────────
    upcoming_events = _detect_recurring_events(df)

    logger.info(
        "[parser] contract=%s  balance=%.2f  tx=%d  burn=%.2f/day  events=%d  errors=%d",
        contract_id, balance, len(df), daily_burn, len(upcoming_events), len(errors),
    )

    return ParsedWalletData(
        balance_mad=balance,
        transactions_df=df,
        daily_burn_rate=daily_burn,
        top_categories=top_cats,
        upcoming_events=upcoming_events,
        summary_stats=summary,
        errors=errors,
    )
