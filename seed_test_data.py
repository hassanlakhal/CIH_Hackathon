import os
import sys
import django
import random
from decimal import Decimal
from datetime import datetime, timedelta, date

# Add the Django project root to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(BASE_DIR, "srcs", "backend", "core")
sys.path.append(PROJECT_ROOT)

# ── SETUP DJANGO ENVIRONMENT ──────────────────────────────────────────
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from wallet.models import Wallet, Transaction, SavingsGoal, AutoSavingRule
from agent.intelligence_service import fetch_wallet_data, generate_financial_intelligence

def seed_direct(phone="212612345678"):
    print(f"\n🚀 Direct Database Seeding for: {phone}")
    
    # 1. Get or Create Wallet
    wallet, created = Wallet.objects.get_or_create(
        phone_number=phone,
        defaults={
            'first_name': 'Hassan',
            'last_name': 'Test',
            'status': 'ACTIVE',
            'contract_id': Wallet.generate_contract_id(),
            'rib': Wallet.generate_rib(),
            'balance': Decimal('5000.00'),
            'safetyFloor': 1000,
            'token': Wallet.generate_token('TR')
        }
    )
    if not created:
        wallet.status = 'ACTIVE'
        wallet.save()
    
    print(f"   ✅ Wallet ID: {wallet.contract_id}")

    # 2. Cleanup existing data to ensure a clean test
    Transaction.objects.filter(source_wallet=wallet).delete()
    Transaction.objects.filter(destination_wallet=wallet).delete()
    SavingsGoal.objects.filter(wallet=wallet).delete()
    
    # 3. Insert 3 Months of Historical Data
    now = datetime.now()
    transactions_to_create = []

    for month_offset in range(3, -1, -1):  # From 3 months ago to current
        base_date = now - timedelta(days=month_offset * 30)
        
        # --- Recurring Income (Salary) ---
        salary_date = datetime(base_date.year, base_date.month, 1, 9, 0)
        transactions_to_create.append(Transaction(
            transaction_type='CASH_IN',
            status='CONFIRMED',
            amount=Decimal('8000.00'),
            total_amount=Decimal('8000.00'),
            source_wallet=wallet,
            source_phone="BANK_TRANSFER",
            beneficiary_first_name=wallet.first_name,
            beneficiary_last_name=wallet.last_name,
            client_note="Monthly Salary",
            created_at=salary_date
        ))

        # --- Fixed Expense (Rent) ---
        rent_date = datetime(base_date.year, base_date.month, 5, 10, 0)
        transactions_to_create.append(Transaction(
            transaction_type='W2M',
            status='CONFIRMED',
            amount=Decimal('2500.00'),
            total_amount=Decimal('2500.00'),
            source_wallet=wallet,
            source_phone=phone,
            beneficiary_first_name="Landlord",
            client_note="Apartment Rent",
            mcc="6513", # Real Estate Agents and Managers - Rentals
            created_at=rent_date
        ))

        # --- Weekly Groceries ---
        for week in range(4):
            grocery_date = rent_date + timedelta(days=week * 7 + 2)
            if grocery_date > now: continue
            transactions_to_create.append(Transaction(
                transaction_type='W2M',
                status='CONFIRMED',
                amount=Decimal('450.00'),
                total_amount=Decimal('450.00'),
                source_wallet=wallet,
                source_phone=phone,
                beneficiary_first_name="Marjane",
                mcc="5411", # Grocery Stores, Supermarkets
                created_at=grocery_date
            ))

        # --- Utilities ---
        util_date = datetime(base_date.year, base_date.month, 15, 14, 0)
        transactions_to_create.append(Transaction(
            transaction_type='W2M',
            status='CONFIRMED',
            amount=Decimal('300.00'),
            total_amount=Decimal('300.00'),
            source_wallet=wallet,
            source_phone=phone,
            client_note="Lydec Electricity/Water",
            mcc="4900", # Utilities — Electric, Gas, Heating Oil, Sanitary, Water
            created_at=util_date
        ))

    # Bulk create for efficiency (Note: auto_now_add=True might override created_at in some setups, 
    # but in most Django versions you can manually set it during creation)
    Transaction.objects.bulk_create(transactions_to_create)
    
    # Force update created_at because bulk_create ignores auto_now_add=True values if provided 
    # depending on backend, but here we just manually update them for the history.
    # Note: For SQLite/Postgres with auto_now_add, manually setting usually works.
    
    print(f"   ✅ Seeded {len(transactions_to_create)} historical transactions.")

    # 4. Setup Savings Goal
    goal = SavingsGoal.objects.create(
        wallet=wallet,
        title="Emergency Fund",
        target_amount=Decimal('20000.00'),
        current_saved=Decimal('1500.00'),
        target_date=date(now.year + 1, 1, 1),
        priority='HIGH',
        status='ACTIVE'
    )
    print(f"   ✅ Savings Goal: {goal.title} (Target: {goal.target_amount} MAD)")

    # 5. Trigger AI Intelligence (The Prediction Test)
    print("\n🧠 Triggering AI Intelligence Service...")
    
    base_url = "http://localhost:8000" # Internal URL for service-to-service calls
    wallet_data = fetch_wallet_data(wallet.contract_id, base_url=base_url)
    
    ai_result = generate_financial_intelligence(
        wallet_data=wallet_data,
        safety_floor=float(wallet.safetyFloor),
        goal_amount=float(goal.target_amount),
        current_saved=float(goal.current_saved)
    )
    
    raw = ai_result.raw_json
    print("\n--- AI PREDICTION RESULTS ---")
    print(f"Confidence Score: {raw.get('summary', {}).get('confidenceScore', 0)}%")
    print(f"Stability: {raw.get('summary', {}).get('financialStability', 'unknown')}")
    print(f"Recommended Savings: {raw.get('savingsRecommendation', {}).get('recommendedSavingsAmountMonthly', 0)} MAD")
    print(f"Estimated Months to Goal: {raw.get('goalForecast', {}).get('estimatedMonthsToGoal', 'N/A')}")
    print(f"Predicted Completion Date: {raw.get('goalForecast', {}).get('predictedGoalCompletionDate', 'N/A')}")
    print("\nInsights:")
    for insight in raw.get('insights', []):
        print(f" - {insight}")

    print("\n✨ Direct Seeding and Prediction Test Complete!")

if __name__ == "__main__":
    seed_direct()
