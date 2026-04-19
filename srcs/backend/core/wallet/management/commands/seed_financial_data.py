import random
from decimal import Decimal
from datetime import datetime, timedelta, date
from django.core.management.base import BaseCommand
from wallet.models import Wallet, Transaction, SavingsGoal
from agent.intelligence_service import fetch_wallet_data, generate_financial_intelligence

class Command(BaseCommand):
    help = 'Directly seeds historical financial data into the database for testing AI insights.'

    def add_arguments(self, parser):
        parser.add_argument('--phone', type=str, default='212612345678', help='Phone number for the test wallet')

    def handle(self, *args, **options):
        phone = options['phone']
        self.stdout.write(self.style.SUCCESS(f"\n🚀 Direct Database Seeding for: {phone}"))
        
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
        
        self.stdout.write(f"   ✅ Wallet ID: {wallet.contract_id}")

        # 2. Cleanup existing data
        Transaction.objects.filter(source_wallet=wallet).delete()
        Transaction.objects.filter(destination_wallet=wallet).delete()
        SavingsGoal.objects.filter(wallet=wallet).delete()
        
        # 3. Insert 3 Months of Historical Data
        now = datetime.now()
        transactions_to_create = []

        for month_offset in range(3, -1, -1):
            base_date = now - timedelta(days=month_offset * 30)
            
            # --- Salary ---
            salary_date = datetime(base_date.year, base_date.month, 1, 9, 0)
            t = Transaction.objects.create(
                transaction_type='CASH_IN',
                status='CONFIRMED',
                amount=Decimal('8000.00'),
                total_amount=Decimal('8000.00'),
                source_wallet=wallet,
                source_contract_id=wallet.contract_id,
                source_phone="BANK_TRANSFER",
                beneficiary_first_name=wallet.first_name,
                beneficiary_last_name=wallet.last_name,
                client_note="Monthly Salary"
            )
            Transaction.objects.filter(id=t.id).update(created_at=salary_date)

            # --- Rent ---
            rent_date = datetime(base_date.year, base_date.month, 5, 10, 0)
            t = Transaction.objects.create(
                transaction_type='W2M',
                status='CONFIRMED',
                amount=Decimal('2500.00'),
                total_amount=Decimal('2500.00'),
                source_wallet=wallet,
                source_contract_id=wallet.contract_id,
                source_phone=phone,
                beneficiary_first_name="Landlord",
                client_note="Apartment Rent",
                mcc="6513"
            )
            Transaction.objects.filter(id=t.id).update(created_at=rent_date)

            # --- Weekly Groceries ---
            for week in range(4):
                grocery_date = rent_date + timedelta(days=week * 7 + 2)
                if grocery_date > now: continue
                t = Transaction.objects.create(
                    transaction_type='W2M',
                    status='CONFIRMED',
                    amount=Decimal('450.00'),
                    total_amount=Decimal('450.00'),
                    source_wallet=wallet,
                    source_contract_id=wallet.contract_id,
                    source_phone=phone,
                    beneficiary_first_name="Marjane",
                    mcc="5411"
                )
                Transaction.objects.filter(id=t.id).update(created_at=grocery_date)

        self.stdout.write(self.style.SUCCESS(f"   ✅ Seeded historical transactions with correct dates."))

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
        self.stdout.write(f"   ✅ Savings Goal: {goal.title} (Target: {goal.target_amount} MAD)")

        # 5. Trigger AI Intelligence
        self.stdout.write("\n🧠 Triggering AI Intelligence Service...")
        
        # Use internal URL or local import? Using fetch_wallet_data is fine.
        base_url = "http://localhost:8000"
        wallet_data = fetch_wallet_data(wallet.contract_id, base_url=base_url)
        
        ai_result = generate_financial_intelligence(
            wallet_data=wallet_data,
            safety_floor=float(wallet.safetyFloor),
            goal_amount=float(goal.target_amount),
            current_saved=float(goal.current_saved)
        )
        
        raw = ai_result.raw_json
        self.stdout.write("\n" + self.style.SUCCESS("--- AI PREDICTION RESULTS ---"))
        self.stdout.write(f"Confidence Score: {raw.get('summary', {}).get('confidenceScore', 0)}%")
        self.stdout.write(f"Stability: {raw.get('summary', {}).get('financialStability', 'unknown')}")
        self.stdout.write(f"Recommended Savings: {raw.get('savingsRecommendation', {}).get('recommendedSavingsAmountMonthly', 0)} MAD")
        self.stdout.write(f"Predicted Completion Date: {raw.get('goalForecast', {}).get('predictedGoalCompletionDate', 'N/A')}")
        self.stdout.write("\nInsights:")
        for insight in raw.get('insights', []):
            self.stdout.write(f" - {insight}")

        self.stdout.write(self.style.SUCCESS("\n✨ Direct Seeding and Prediction Test Complete!"))
