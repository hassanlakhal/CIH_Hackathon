import uuid
import random
import string
from decimal import Decimal
from django.db import models


class Wallet(models.Model):
    """
    Represents a customer or merchant electronic wallet.
    Stores identity, financial, and status information.
    """

    WALLET_TYPE_CHOICES = [
        ('CUSTOMER', 'Customer'),
        ('MERCHANT', 'Merchant'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending Activation'),
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
    ]

    PROVIDER_CHOICES = [
        ('IAM', 'IAM'),
        ('INWI', 'INWI'),
        ('ORANGE', 'Orange'),
    ]
    isSurveyNeed = models.BooleanField(default=False)
    # ── Identity ──────────────────────────────────────────────
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='IAM')
    first_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    email = models.EmailField(blank=True, null=True, unique=True)

    # ── Personal Info ─────────────────────────────────────────
    place_of_birth = models.CharField(max_length=100, blank=True, default='')
    date_of_birth = models.CharField(max_length=20, blank=True, default='')
    address_line1 = models.CharField(max_length=255, blank=True, default='')
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=10, default='MAR')
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, default='')
    nationality = models.CharField(max_length=50, blank=True, null=True)
    family_status = models.CharField(max_length=20, blank=True, null=True)
    number_of_children = models.IntegerField(blank=True, null=True)
    profession = models.CharField(max_length=100, blank=True, null=True)
    average_income = models.CharField(max_length=20, blank=True, null=True)

    # ── Identification ────────────────────────────────────────
    legal_type = models.CharField(max_length=20, blank=True, default='')
    legal_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    document_expiry_date = models.CharField(max_length=20, blank=True, null=True)

    # ── Wallet Details ────────────────────────────────────────
    wallet_type = models.CharField(max_length=10, choices=WALLET_TYPE_CHOICES, default='CUSTOMER')
    contract_id = models.CharField(max_length=50, blank=True, null=True, unique=True, db_index=True)
    rib = models.CharField(max_length=30, blank=True, null=True)
    token = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    otp = models.CharField(max_length=10, blank=True, null=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    level = models.CharField(max_length=10, default='000')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    product_id = models.CharField(max_length=10, default='000')
    product_type_id = models.CharField(max_length=10, default='000')
    product_name = models.CharField(max_length=50, default='CDP BASIC')
    product_type_name = models.CharField(max_length=50, default='PARTICULIER')

    # ── Merchant-specific ─────────────────────────────────────
    company_name = models.CharField(max_length=200, blank=True, default='')
    business_address = models.CharField(max_length=255, blank=True, default='')
    merchant_category = models.CharField(max_length=100, blank=True, default='')
    tax_id = models.CharField(max_length=50, blank=True, default='')
    commercial_registration = models.CharField(max_length=50, blank=True, default='')
    company_registration_id = models.CharField(max_length=50, blank=True, default='')
    trade_license = models.CharField(max_length=50, blank=True, default='')
    activity_sector = models.CharField(max_length=100, blank=True, default='')
    activity_type = models.CharField(max_length=100, blank=True, default='')
    legal_structure = models.CharField(max_length=50, blank=True, default='')
    job_position = models.CharField(max_length=100, blank=True, default='')
    landline_number = models.CharField(max_length=20, blank=True, null=True)
    professional_tax_number = models.CharField(max_length=50, blank=True, default='')
    registration_center = models.CharField(max_length=100, blank=True, default='')
    registry_registration_number = models.CharField(max_length=50, blank=True, default='')

    # ── Institutional ─────────────────────────────────────────
    institution_id = models.CharField(max_length=10, default='0001')
    agence_id = models.CharField(max_length=10, default='211')
    distributeur_id = models.CharField(max_length=10, default='000104')
    channel_id = models.CharField(max_length=5, default='P')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.wallet_type} - {self.phone_number} ({self.contract_id or 'Pending'})"

    # ── Static generators ─────────────────────────────────────

    @staticmethod
    def generate_token(prefix='TR'):
        """Generate a unique token like TR2404781353895901."""
        num = ''.join(random.choices(string.digits, k=16))
        return f"{prefix}{num}"

    @staticmethod
    def generate_contract_id():
        """Generate a contract ID like LAN240478508299911."""
        num = ''.join(random.choices(string.digits, k=15))
        return f"LAN{num}"

    @staticmethod
    def generate_rib():
        """Generate a 24-digit RIB."""
        return ''.join(random.choices(string.digits, k=24))

    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP code."""
        return ''.join(random.choices(string.digits, k=6))

    @staticmethod
    def generate_transaction_token():
        """Generate a 32-char hex transaction token."""
        return uuid.uuid4().hex.upper()

    @staticmethod
    def generate_reference_id():
        """Generate a 10-digit reference ID."""
        return ''.join(random.choices(string.digits, k=10))


class Transaction(models.Model):
    """
    Records all wallet transactions including cash in/out,
    wallet-to-wallet, merchant transactions, transfers, and ATM withdrawals.
    """

    TYPE_CHOICES = [
        ('CASH_IN', 'Cash In'),
        ('CASH_OUT', 'Cash Out'),
        ('W2W', 'Wallet to Wallet'),
        ('W2M', 'Wallet to Merchant'),
        ('M2M', 'Merchant to Merchant'),
        ('M2W', 'Merchant to Wallet'),
        ('TRANSFER', 'Bank Transfer'),
        ('ATM', 'ATM Withdrawal'),
        ('QR', 'QR Code Payment'),
    ]

    # API type codes matching the doc
    API_TYPE_MAP = {
        'CASH_IN': 'CI',
        'CASH_OUT': 'CO',
        'W2W': 'MMD',
        'W2M': 'TM',
        'M2M': 'CC',
        'M2W': 'MW',
        'TRANSFER': 'TT',
        'ATM': 'GAB',
        'QR': 'QR',
    }

    STATUS_CHOICES = [
        ('SIMULATED', 'Simulated'),
        ('OTP_SENT', 'OTP Sent'),
        ('CONFIRMED', 'Confirmed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]

    # ── Core ──────────────────────────────────────────────────
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='SIMULATED')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    fees = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_fees = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=5, default='MAD')

    # ── References ────────────────────────────────────────────
    reference_id = models.CharField(max_length=20, blank=True, db_index=True)
    token = models.CharField(max_length=50, blank=True, db_index=True)
    transaction_id = models.CharField(max_length=50, blank=True)

    # ── Source ────────────────────────────────────────────────
    source_wallet = models.ForeignKey(
        Wallet, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sent_transactions'
    )
    source_phone = models.CharField(max_length=20, blank=True)
    source_contract_id = models.CharField(max_length=50, blank=True)

    # ── Destination ───────────────────────────────────────────
    destination_wallet = models.ForeignKey(
        Wallet, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='received_transactions'
    )
    destination_phone = models.CharField(max_length=20, blank=True)
    destination_rib = models.CharField(max_length=30, blank=True)

    # ── Beneficiary ───────────────────────────────────────────
    beneficiary_first_name = models.CharField(max_length=100, blank=True)
    beneficiary_last_name = models.CharField(max_length=100, blank=True)

    # ── Notes & Extra ─────────────────────────────────────────
    client_note = models.CharField(max_length=255, blank=True)
    otp = models.CharField(max_length=10, blank=True)
    qr_code = models.CharField(max_length=100, blank=True)
    mcc = models.CharField(max_length=10, blank=True)
    amount_input_mode = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} {self.currency} ({self.status})"

    @property
    def api_type_code(self):
        """Return the API type code for this transaction."""
        return self.API_TYPE_MAP.get(self.transaction_type, self.transaction_type)

class userSurvey(models.Model):
    theWallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='survey')
    digitalPlatforms = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    rent = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    groceries = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    utilities = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    entertainment = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    transportation = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)