import random
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from wallet.models import Wallet, Transaction

class Command(BaseCommand):
    help = "Seed the database with sample Wallets and Transactions for AI testing."

    def handle(self, *args, **kwargs):
        self.stdout.write("Clearing old data...")
        Transaction.objects.all().delete()
        Wallet.objects.all().delete()

        self.stdout.write("Creating mock wallets...")
        # 1. Create a customer wallet
        customer = Wallet.objects.create(
            wallet_type='CUSTOMER',
            phone_number='0600000001',
            first_name='Hassan',
            last_name='User',
            contract_id=Wallet.generate_contract_id(),
            status='ACTIVE',
            balance=Decimal('5000.00')
        )

        # 2. Create some merchant wallets
        merchants = []
        for name, mcc in [("Marjane", "5411"), ("Inwi Telecom", "4814"), ("Zara", "5651"), ("ONEE Water", "4900")]:
            merchant = Wallet.objects.create(
                wallet_type='MERCHANT',
                phone_number=f'06000000{len(merchants)+2}',
                company_name=name,
                contract_id=Wallet.generate_contract_id(),
                status='ACTIVE',
                balance=Decimal('10000.00')
            )
            merchants.append((merchant, mcc))

        self.stdout.write("Creating mock transactions for last 30 days...")
        now = timezone.now()
        
        # Give the customer some initial cash
        Transaction.objects.create(
            transaction_type='CASH_IN',
            status='CONFIRMED',
            amount=Decimal('8000.00'),
            total_amount=Decimal('8000.00'),
            destination_wallet=customer,
            client_note="Initial Deposit",
        )

        # Generate random transactions for the customer
        for i in range(25):
            merchant, mcc = random.choice(merchants)
            
            # Create a date in the past 30 days
            days_ago = random.randint(1, 30)
            tx_date = now - timedelta(days=days_ago)
            
            # Amount
            amount = Decimal(str(random.randint(50, 600)))
            
            tx = Transaction.objects.create(
                transaction_type='W2M',
                status='CONFIRMED',
                amount=amount,
                total_amount=amount,
                source_wallet=customer,
                destination_wallet=merchant,
                mcc=mcc,
                client_note=f"Payment to {merchant.company_name}",
            )
            # Override created_at for historical AI testing
            tx.created_at = tx_date
            tx.save()

        # Generate a recurring bill explicitly (e.g. ONEE Water every 10 days)
        for days_ago in [25, 15, 5]:
            tx = Transaction.objects.create(
                transaction_type='W2M',
                status='CONFIRMED',
                amount=Decimal('120.00'),
                total_amount=Decimal('120.00'),
                source_wallet=customer,
                destination_wallet=merchants[3][0], # ONEE Water
                mcc=merchants[3][1],
                client_note="Water Bill",
            )
            tx.created_at = now - timedelta(days=days_ago)
            tx.save()

        self.stdout.write(self.style.SUCCESS(f"Database successfully seeded! Customer Contract ID: {customer.contract_id}"))
