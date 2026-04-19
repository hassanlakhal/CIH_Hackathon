"""
AI Financial Coaching Engine
=============================
Handles Gemini AI integration for generating wallet insights,
financial predictions, and auto-save calculations.

Falls back to a rule-based mock if no GEMINI_API_KEY is configured.
"""

import json
import math
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Sum, Q

from .models import (
    Wallet, Transaction, userSurvey,
    SavingsGoal, MonthlySavingRecord, WalletInsight, FinancialHealthScore, AutoSavingRule,
)

# ─── Try importing Google Generative AI ──────────────────────
try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


def _safe_decimal(value, default='0'):
    try:
        return Decimal(str(value).strip() if isinstance(value, str) else str(value))
    except (InvalidOperation, ValueError, AttributeError):
        return Decimal(default)


# ═════════════════════════════════════════════════════════════════
#  AUTO-SAVE CALCULATION
# ═════════════════════════════════════════════════════════════════

def calculate_auto_save(rule, transaction_amount):
    """
    Calculate the auto-save amount for a given rule and transaction.
    Returns the amount to save (Decimal).
    """
    amount = _safe_decimal(transaction_amount)
    if rule.rule_type == 'ROUND_UP':
        # Round up to nearest 'value' (e.g., 10 MAD) and save the diff
        unit = _safe_decimal(rule.value, '10')
        if unit <= 0:
            return Decimal('0')
        rounded = math.ceil(float(amount) / float(unit)) * float(unit)
        return _safe_decimal(rounded) - amount
    elif rule.rule_type == 'PERCENT_INCOME':
        # Save X% of the incoming amount
        pct = _safe_decimal(rule.value, '0') / Decimal('100')
        return amount * pct
    elif rule.rule_type == 'FIXED_MONTHLY':
        # Fixed amount — only triggered once per month (handled by caller)
        return _safe_decimal(rule.value)
    return Decimal('0')


def process_auto_save_on_transaction(wallet, transaction_amount):
    """
    After a CASH_IN or M2W transaction is confirmed, check all active
    AutoSavingRules and apply them. Updates the primary goal's current_saved.
    Returns total auto-saved amount.
    """
    rules = AutoSavingRule.objects.filter(wallet=wallet, is_active=True)
    if not rules.exists():
        return Decimal('0')

    # Find primary goal (highest priority active goal)
    primary_goal = SavingsGoal.objects.filter(
        wallet=wallet, status='ACTIVE'
    ).order_by('-priority', 'created_at').first()

    total_auto_saved = Decimal('0')
    today = date.today()
    month_start = today.replace(day=1)

    for rule in rules:
        save_amount = calculate_auto_save(rule, transaction_amount)
        if save_amount <= 0:
            continue

        # Determine which goal this feeds
        target_goal = rule.goal or primary_goal
        if target_goal and target_goal.status == 'ACTIVE':
            target_goal.current_saved += save_amount
            if target_goal.current_saved >= target_goal.target_amount:
                target_goal.status = 'ACHIEVED'
            target_goal.recalculate_monthly_needed()
            target_goal.save()

        # Update rule's cumulative tracker
        rule.total_auto_saved += save_amount
        rule.save()

        # Update or create the monthly record for this goal
        if target_goal:
            record, _ = MonthlySavingRecord.objects.get_or_create(
                wallet=wallet,
                goal=target_goal,
                month=month_start,
                defaults={
                    'data_source': 'transactions',
                    'safety_floor_applied': _safe_decimal(wallet.safetyFloor),
                }
            )
            record.goal_contribution += save_amount
            record.actual_saved += save_amount
            record.save()

        total_auto_saved += save_amount

    # Virtual Saving Account Trigger Logic
    if wallet.sendToSavingAccount and wallet.savingTriggerBalance > 0 and wallet.monthlySavingAmount > 0:
        if wallet.balance >= wallet.savingTriggerBalance:
            # Check if we already did the transfer this month by looking at monthly records
            # For simplicity in hackathon, we assume the transfer happens if balance allows and it's not marked today.
            if wallet.balance >= wallet.monthlySavingAmount:
                # To prevent it from hitting every transaction, we can just track the last saved date or simply
                # deduct it if the monthly goal isn't met in the record. Let's just track it as part of auto saved.
                pass # The AI will see this logic, but subtracting directly here on every txn might drain the account.
                # Actually, adding a small fraction proportional to transaction or just one-off. 
                # We'll just leave it as informational for AI context to recommend.

    return total_auto_saved


# ═════════════════════════════════════════════════════════════════
#  CONTEXT BUILDER (for AI prompt)
# ═════════════════════════════════════════════════════════════════

def _build_ai_context(wallet):
    """Build the full context payload sent to the AI."""
    today = date.today()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # ── Active goal ──
    primary_goal = SavingsGoal.objects.filter(
        wallet=wallet, status='ACTIVE'
    ).order_by('-priority', 'created_at').first()

    goal_context = None
    if primary_goal:
        primary_goal.recalculate_monthly_needed()
        primary_goal.save()
        goal_context = {
            'title': primary_goal.title,
            'target': float(primary_goal.target_amount),
            'saved': float(primary_goal.current_saved),
            'target_date': primary_goal.target_date.isoformat(),
            'monthly_needed': float(primary_goal.monthly_needed),
        }

    # ── Last 30 days transactions ──
    thirty_days_ago = today - timedelta(days=30)
    recent_txns = Transaction.objects.filter(
        Q(source_wallet=wallet) | Q(destination_wallet=wallet),
        status='CONFIRMED',
        created_at__gte=thirty_days_ago,
    ).order_by('-created_at')

    incomes = []
    expenses = []
    for txn in recent_txns:
        entry = {
            'type': txn.transaction_type,
            'amount': float(txn.amount),
            'date': txn.created_at.strftime('%Y-%m-%d'),
            'note': txn.client_note or txn.transaction_type,
        }
        # Income: CASH_IN, M2W (destination), received W2W
        if txn.transaction_type == 'CASH_IN' and txn.source_wallet == wallet:
            incomes.append(entry)
        elif txn.transaction_type == 'M2W' and txn.destination_wallet == wallet:
            incomes.append(entry)
        elif txn.transaction_type == 'W2W' and txn.destination_wallet == wallet:
            incomes.append(entry)
        # Expenses: CASH_OUT, W2M, W2W (source), ATM, TRANSFER
        elif txn.source_wallet == wallet:
            expenses.append(entry)

    # ── Survey data ──
    survey_data = {}
    survey = userSurvey.objects.filter(theWallet=wallet).order_by('-created_at').first()
    if survey:
        survey_data = {
            'rent': float(survey.rent),
            'groceries': float(survey.groceries),
            'utilities': float(survey.utilities),
            'transportation': float(survey.transportation),
            'entertainment': float(survey.entertainment),
            'digitalPlatforms': float(survey.digitalPlatforms),
        }

    # ── Historical monthly records ──
    history = []
    past_records = MonthlySavingRecord.objects.filter(
        wallet=wallet
    ).order_by('-month')[:6]
    for rec in past_records:
        history.append({
            'month': rec.month.strftime('%Y-%m'),
            'saved': float(rec.actual_saved),
            'target': float(rec.target_for_month),
            'income': float(rec.income_total),
            'expenses': float(rec.expense_total),
        })

    data_source = 'transactions' if recent_txns.exists() else ('survey' if survey_data else 'none')

    return {
        'context': {
            'current_balance': float(wallet.balance),
            'safety_floor': float(wallet.safetyFloor),
            'send_to_saving_account': wallet.sendToSavingAccount,
            'saving_account_balance': float(wallet.savingAccountBalance),
            'monthly_saving_amount': float(wallet.monthlySavingAmount),
            'saving_trigger_balance': float(wallet.savingTriggerBalance),
            'active_goal': goal_context,
        },
        'last_30_days': {
            'source': data_source,
            'incomes': incomes,
            'expenses': expenses,
        },
        'survey_data': survey_data,
        'history': history,
    }


# ═════════════════════════════════════════════════════════════════
#  AI PROMPT
# ═════════════════════════════════════════════════════════════════

EXPECTED_SCHEMA = """{
  "total_income_last_month": <number>,
  "total_expenses_last_month": <number>,
  "net_savings_last_month": <number>,
  "savings_rate_pct": <number 0-100>,
  "estimated_income_this_month": <number>,
  "estimated_expenses_this_month": <number>,
  "recommended_saving_this_month": <number>,
  "safety_floor_recommendation": <number>,
  "predicted_goal_date": "<YYYY-MM-DD or null>",
  "goal_on_track": <boolean>,
  "income_sources": {"<type>": <amount>, ...},
  "expense_categories": {"<type>": <amount>, ...},
  "necessary_expenses": {"<category>": <amount>, ...},
  "optional_expenses": {"<category>": <amount>, ...},
  "saving_opportunities": ["<suggestion 1>", "<suggestion 2>", ...],
  "summary_message": "<AI narrative about last month's performance>",
  "tip": "<actionable tip for this month>",
  "warning": "<warning if safety floor at risk or empty string>",
  "health_score": <integer 0-100>,
  "health_score_delta": <integer, change vs last month>,
  "goal_achievement_plan": "<AI estimation/plan on how to achieve the goal based on current habits>"
}"""


def _build_prompt(context):
    """Construct the full prompt for Gemini."""
    return f"""You are a financial coaching AI for a Moroccan mobile wallet app called Mind Save.
Analyze the user's financial data and produce a structured JSON report.

USER DATA:
{json.dumps(context, indent=2, default=str)}

RULES:
1. If transaction data is available, use it as primary source. Otherwise fall back to survey data.
2. Savings rate = net_savings / income * 100. If no income, set to 0.
3. Safety floor = recommended minimum balance to never go below. Base it on 1 month of essential expenses.
4. If the user has an active savings goal, predict when they will reach it based on their actual saving velocity.
5. Categorize expenses as necessary (rent, groceries, utilities, transport) vs optional (entertainment, ATM, subscriptions).
6. Suggest 2-3 specific saving opportunities based on their spending patterns.
7. Health score: 0-100 based on savings rate (40%), goal progress (30%), expense stability (30%).
8. All amounts are in MAD (Moroccan Dirham).
9. Write the summary_message, tip, and goal_achievement_plan in English, concise and motivating. Provide a concrete estimation of how to achieve the active goal in goal_achievement_plan.
10. If safety floor is at risk (balance near or below it), set a warning.

Reply ONLY with valid JSON matching this exact schema (no markdown, no explanation):
{EXPECTED_SCHEMA}"""


# ═════════════════════════════════════════════════════════════════
#  GEMINI API CALL
# ═════════════════════════════════════════════════════════════════

def _call_gemini(prompt):
    """Call Google Gemini API and return parsed JSON."""
    api_key = getattr(settings, 'GEMINI_API_KEY', '')
    if not api_key or not HAS_GENAI:
        return None

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
        )
        text = response.text.strip()

        # Strip markdown code fences if present
        if text.startswith('```'):
            lines = text.split('\n')
            text = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])

        return json.loads(text)
    except Exception as e:
        print(f"[ai_engine] Gemini API error: {e}")
        return None


# ═════════════════════════════════════════════════════════════════
#  MOCK FALLBACK (rule-based analysis)
# ═════════════════════════════════════════════════════════════════

def _generate_mock_insight(context):
    """Generate a realistic insight without AI, using simple math."""
    ctx = context.get('context', {})
    last_30 = context.get('last_30_days', {})
    survey = context.get('survey_data', {})
    history = context.get('history', [])

    # Calculate totals from transactions
    total_income = sum(i['amount'] for i in last_30.get('incomes', []))
    total_expenses = sum(e['amount'] for e in last_30.get('expenses', []))

    # Fallback to survey if no transactions
    if total_income == 0 and total_expenses == 0 and survey:
        total_expenses = sum(survey.values())
        total_income = total_expenses * 1.3  # Assume income is 30% more than expenses

    net_savings = total_income - total_expenses
    savings_rate = (net_savings / total_income * 100) if total_income > 0 else 0

    # Safety floor = 1 month of necessary expenses
    necessary = {}
    optional = {}
    if survey:
        necessary = {
            'rent': survey.get('rent', 0),
            'groceries': survey.get('groceries', 0),
            'utilities': survey.get('utilities', 0),
            'transportation': survey.get('transportation', 0),
        }
        optional = {
            'entertainment': survey.get('entertainment', 0),
            'digitalPlatforms': survey.get('digitalPlatforms', 0),
        }
    else:
        # Categorize from transactions
        for exp in last_30.get('expenses', []):
            cat = exp.get('type', 'OTHER')
            if cat in ('W2M', 'TRANSFER'):
                necessary[cat] = necessary.get(cat, 0) + exp['amount']
            else:
                optional[cat] = optional.get(cat, 0) + exp['amount']

    safety_floor = sum(necessary.values()) if necessary else total_expenses * 0.5

    # Income sources breakdown
    income_sources = {}
    for inc in last_30.get('incomes', []):
        t = inc.get('type', 'OTHER')
        income_sources[t] = income_sources.get(t, 0) + inc['amount']

    # Expense categories
    expense_categories = {}
    for exp in last_30.get('expenses', []):
        t = exp.get('type', 'OTHER')
        expense_categories[t] = expense_categories.get(t, 0) + exp['amount']

    # Goal prediction
    goal = ctx.get('active_goal')
    predicted_goal_date = None
    goal_on_track = True
    if goal and net_savings > 0:
        remaining = goal['target'] - goal['saved']
        if remaining <= 0:
            predicted_goal_date = date.today().isoformat()
        else:
            months_to_go = remaining / float(net_savings) if net_savings > 0 else 99
            predicted_date = date.today() + timedelta(days=int(months_to_go * 30))
            predicted_goal_date = predicted_date.isoformat()
            if goal.get('target_date'):
                goal_on_track = predicted_date.isoformat() <= goal['target_date']
    elif goal:
        goal_on_track = False

    # Saving opportunities
    opportunities = []
    if optional.get('entertainment', 0) > 200:
        opportunities.append(f"Reduce entertainment spending by {int(optional['entertainment'] * 0.3)} MAD")
    if optional.get('digitalPlatforms', 0) > 100:
        opportunities.append(f"Review digital subscriptions — potential saving of {int(optional['digitalPlatforms'] * 0.2)} MAD")
    if expense_categories.get('ATM', 0) > 300:
        opportunities.append("Reduce ATM withdrawals — use card payments instead")
    if not opportunities:
        opportunities = ["Set up a round-up rule to save on every transaction", "Consider a fixed monthly auto-save of 200 MAD"]

    # Health score
    savings_score = min(40, int(savings_rate * 0.4))
    goal_score = 0
    if goal:
        progress = goal['saved'] / goal['target'] if goal['target'] > 0 else 0
        goal_score = min(30, int(progress * 30))
    stability_score = 20  # default moderate
    if len(history) >= 2:
        recent_savings = [h.get('saved', 0) for h in history[:3]]
        if all(s > 0 for s in recent_savings):
            stability_score = 30
        elif any(s < 0 for s in recent_savings):
            stability_score = 10

    health_score = savings_score + goal_score + stability_score
    prev_score = history[0].get('saved', health_score) if history else health_score
    delta = health_score - (prev_score if isinstance(prev_score, (int, float)) else health_score)

    # Summary
    if savings_rate >= 30:
        summary = f"Strong month! You saved {int(net_savings)} MAD with a {savings_rate:.0f}% savings rate."
    elif savings_rate >= 10:
        summary = f"Decent month — you saved {int(net_savings)} MAD. There's room to optimize your spending."
    elif total_income > 0:
        summary = f"Tight month — only {int(net_savings)} MAD saved. Let's find ways to cut optional expenses."
    else:
        summary = "No income recorded this month. Complete the survey or add transactions to get personalized insights."

    tip = "Set up a round-up rule to save spare change automatically." if not opportunities else opportunities[0]
    warning = ""
    if ctx.get('current_balance', 0) <= safety_floor:
        warning = "⚠️ Your balance is at or below the safety floor. Avoid non-essential spending."

    return {
        'total_income_last_month': total_income,
        'total_expenses_last_month': total_expenses,
        'net_savings_last_month': net_savings,
        'savings_rate_pct': round(savings_rate, 1),
        'estimated_income_this_month': total_income,  # simple estimate
        'estimated_expenses_this_month': total_expenses * 0.95,
        'recommended_saving_this_month': max(0, net_savings * 1.1),
        'safety_floor_recommendation': safety_floor,
        'predicted_goal_date': predicted_goal_date,
        'goal_on_track': goal_on_track,
        'income_sources': income_sources,
        'expense_categories': expense_categories,
        'necessary_expenses': {k: round(v, 2) for k, v in necessary.items()},
        'optional_expenses': {k: round(v, 2) for k, v in optional.items()},
        'saving_opportunities': opportunities,
        'summary_message': summary,
        'tip': tip,
        'warning': warning,
        'health_score': health_score,
        'health_score_delta': int(delta),
        'goal_achievement_plan': 'Based on your savings rate, try to set apart ' + str(int(net_savings * 0.2)) + ' MAD weekly to stay on track.',
    }


# ═════════════════════════════════════════════════════════════════
#  MAIN ENTRY POINT
# ═════════════════════════════════════════════════════════════════

def generate_wallet_insight(wallet):
    """
    Main function: generate a full AI insight for a wallet.
    1. Build context from transactions + survey + history
    2. Call Gemini (or fallback to mock)
    3. Store WalletInsight + MonthlySavingRecord + FinancialHealthScore
    4. Update SavingsGoal progress
    Returns the created WalletInsight instance.
    """
    today = date.today()
    month_start = today.replace(day=1)

    # 1. Build context
    context = _build_ai_context(wallet)

    # 2. Call AI or fallback
    prompt = _build_prompt(context)
    ai_response = _call_gemini(prompt)
    if ai_response is None:
        ai_response = _generate_mock_insight(context)

    # 3. Store WalletInsight
    predicted_date = None
    if ai_response.get('predicted_goal_date'):
        try:
            predicted_date = date.fromisoformat(str(ai_response['predicted_goal_date']))
        except (ValueError, TypeError):
            pass

    insight = WalletInsight.objects.create(
        wallet=wallet,
        month=month_start,
        total_income_last_month=_safe_decimal(ai_response.get('total_income_last_month', 0)),
        total_expenses_last_month=_safe_decimal(ai_response.get('total_expenses_last_month', 0)),
        net_savings_last_month=_safe_decimal(ai_response.get('net_savings_last_month', 0)),
        savings_rate_pct=_safe_decimal(ai_response.get('savings_rate_pct', 0)),
        estimated_income_this_month=_safe_decimal(ai_response.get('estimated_income_this_month', 0)),
        estimated_expenses_this_month=_safe_decimal(ai_response.get('estimated_expenses_this_month', 0)),
        recommended_saving_this_month=_safe_decimal(ai_response.get('recommended_saving_this_month', 0)),
        safety_floor_recommendation=_safe_decimal(ai_response.get('safety_floor_recommendation', 0)),
        predicted_goal_date=predicted_date,
        goal_on_track=bool(ai_response.get('goal_on_track', True)),
        income_sources=ai_response.get('income_sources', {}),
        expense_categories=ai_response.get('expense_categories', {}),
        necessary_expenses=ai_response.get('necessary_expenses', {}),
        optional_expenses=ai_response.get('optional_expenses', {}),
        saving_opportunities=ai_response.get('saving_opportunities', []),
        summary_message=ai_response.get('summary_message', ''),
        tip=ai_response.get('tip', ''),
        warning=ai_response.get('warning', ''),
        goal_achievement_plan=ai_response.get('goal_achievement_plan', ''),
        health_score=int(ai_response.get('health_score', 0)),
        health_score_delta=int(ai_response.get('health_score_delta', 0)),
        raw_ai_response=ai_response,
    )

    # 4. Update safety floor on wallet
    new_floor = _safe_decimal(ai_response.get('safety_floor_recommendation', 0))
    if new_floor > 0:
        wallet.safetyFloor = int(new_floor)
        wallet.save()

    # 5. Create/update MonthlySavingRecord
    primary_goal = SavingsGoal.objects.filter(
        wallet=wallet, status='ACTIVE'
    ).order_by('-priority', 'created_at').first()

    income_total = _safe_decimal(ai_response.get('total_income_last_month', 0))
    expense_total = _safe_decimal(ai_response.get('total_expenses_last_month', 0))
    net_saved = income_total - expense_total

    record, created = MonthlySavingRecord.objects.get_or_create(
        wallet=wallet,
        goal=primary_goal,
        month=month_start,
        defaults={
            'income_total': income_total,
            'expense_total': expense_total,
            'actual_saved': net_saved,
            'target_for_month': _safe_decimal(ai_response.get('recommended_saving_this_month', 0)),
            'safety_floor_applied': new_floor,
            'goal_contribution': max(Decimal('0'), net_saved),
            'data_source': context['last_30_days']['source'],
        }
    )
    if not created:
        record.income_total = income_total
        record.expense_total = expense_total
        record.actual_saved = net_saved
        record.target_for_month = _safe_decimal(ai_response.get('recommended_saving_this_month', 0))
        record.safety_floor_applied = new_floor
        record.save()

    # 6. Update SavingsGoal progress
    if primary_goal:
        total_contributions = MonthlySavingRecord.objects.filter(
            goal=primary_goal
        ).aggregate(total=Sum('goal_contribution'))['total'] or Decimal('0')
        primary_goal.current_saved = total_contributions
        if primary_goal.current_saved >= primary_goal.target_amount:
            primary_goal.status = 'ACHIEVED'
        if predicted_date:
            primary_goal.predicted_completion_date = predicted_date
        primary_goal.recalculate_monthly_needed()
        primary_goal.save()

    # 7. Store FinancialHealthScore
    health_score_val = int(ai_response.get('health_score', 0))
    savings_rate_pct = float(ai_response.get('savings_rate_pct', 0))

    # Compute sub-scores
    sr_score = min(40, int(savings_rate_pct * 0.4))
    gp_score = 0
    if primary_goal and primary_goal.target_amount > 0:
        progress = float(primary_goal.current_saved) / float(primary_goal.target_amount)
        gp_score = min(30, int(progress * 30))
    stab_score = health_score_val - sr_score - gp_score

    if health_score_val >= 80:
        label = 'EXCELLENT'
    elif health_score_val >= 60:
        label = 'GOOD'
    elif health_score_val >= 40:
        label = 'NEEDS_WORK'
    else:
        label = 'CRITICAL'

    FinancialHealthScore.objects.update_or_create(
        wallet=wallet,
        month=month_start,
        defaults={
            'score': health_score_val,
            'savings_rate_score': sr_score,
            'goal_progress_score': gp_score,
            'stability_score': max(0, stab_score),
            'label': label,
        }
    )

    return insight
