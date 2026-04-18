"""
Wallet Management Serializers
==============================
Input validation serializers for all Wallet Management KIT API endpoints.
"""

from rest_framework import serializers


# ═══════════════════════════════════════════════════════════════
# 4.1  Wallet Creation
# ═══════════════════════════════════════════════════════════════

class WalletPreRegistrationSerializer(serializers.Serializer):
    """4.1.1 - Wallet pre-registration input."""
    phoneNumber = serializers.CharField(max_length=20)
    phoneOperator = serializers.CharField(max_length=20, required=False, default='IAM')
    clientFirstName = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    clientLastName = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    email = serializers.EmailField(required=False, default='', allow_blank=True)
    placeOfBirth = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    dateOfBirth = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)
    clientAddress = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
    gender = serializers.CharField(max_length=10, required=False, default='', allow_blank=True)
    legalType = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)
    legalId = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)


class WalletActivationSerializer(serializers.Serializer):
    """4.1.2 - Wallet activation input."""
    otp = serializers.CharField(max_length=10)
    token = serializers.CharField(max_length=50)


# ═══════════════════════════════════════════════════════════════
# 4.2  Client Info
# ═══════════════════════════════════════════════════════════════

class ClientInfoSerializer(serializers.Serializer):
    """4.2 - Consulting customer information."""
    phoneNumber = serializers.CharField(max_length=20)
    identificationType = serializers.CharField(max_length=20)
    identificationNumber = serializers.CharField(max_length=50)


# ═══════════════════════════════════════════════════════════════
# 4.5  Cash IN
# ═══════════════════════════════════════════════════════════════

class CashInSimulationSerializer(serializers.Serializer):
    """4.5.1 - Cash IN simulation input."""
    contractId = serializers.CharField(max_length=50)
    level = serializers.CharField(max_length=10, required=False, default='2')
    phoneNumber = serializers.CharField(max_length=20)
    amount = serializers.CharField(max_length=20)
    fees = serializers.CharField(max_length=20, required=False, default='0')


class CashInConfirmationSerializer(serializers.Serializer):
    """4.5.2 - Cash IN confirmation input."""
    token = serializers.CharField(max_length=50)
    amount = serializers.CharField(max_length=20)
    fees = serializers.CharField(max_length=20, required=False, default='0')


# ═══════════════════════════════════════════════════════════════
# 4.6  Cash OUT
# ═══════════════════════════════════════════════════════════════

class CashOutSimulationSerializer(serializers.Serializer):
    """4.6.1 - Cash OUT simulation input."""
    phoneNumber = serializers.CharField(max_length=20)
    amount = serializers.CharField(max_length=20)
    fees = serializers.CharField(max_length=20, required=False, default='0')


class CashOutOTPSerializer(serializers.Serializer):
    """4.6.2 - Cash OUT OTP generation input."""
    phoneNumber = serializers.CharField(max_length=20)


class CashOutConfirmationSerializer(serializers.Serializer):
    """4.6.3 - Cash OUT confirmation input."""
    token = serializers.CharField(max_length=50)
    phoneNumber = serializers.CharField(max_length=20)
    otp = serializers.CharField(max_length=10)
    amount = serializers.CharField(max_length=20)
    fees = serializers.CharField(max_length=20, required=False, default='0')


# ═══════════════════════════════════════════════════════════════
# 4.7  Wallet to Wallet
# ═══════════════════════════════════════════════════════════════

class W2WSimulationSerializer(serializers.Serializer):
    """4.7.1 - Wallet to Wallet simulation input."""
    clentNote = serializers.CharField(max_length=255, required=False, default='W2W', allow_blank=True)
    contractId = serializers.CharField(max_length=50)
    amout = serializers.CharField(max_length=20)  # Note: typo matches the API doc
    fees = serializers.CharField(max_length=20, required=False, default='0')
    destinationPhone = serializers.CharField(max_length=20)
    mobileNumber = serializers.CharField(max_length=20)


class W2WOTPSerializer(serializers.Serializer):
    """4.7.2 - Wallet to Wallet OTP generation input."""
    phoneNumber = serializers.CharField(max_length=20)


class W2WConfirmationSerializer(serializers.Serializer):
    """4.7.3 - Wallet to Wallet confirmation input."""
    mobileNumber = serializers.CharField(max_length=20)
    contractId = serializers.CharField(max_length=50)
    otp = serializers.CharField(max_length=10)
    referenceId = serializers.CharField(max_length=20)
    destinationPhone = serializers.CharField(max_length=20)
    fees = serializers.CharField(max_length=20, required=False, default='0')


# ═══════════════════════════════════════════════════════════════
# 4.8  Transfer (Virement)
# ═══════════════════════════════════════════════════════════════

class TransferSimulationSerializer(serializers.Serializer):
    """4.8.1 - Transfer simulation input."""
    clientNote = serializers.CharField(max_length=255, required=False, default='W2W', allow_blank=True)
    ContractId = serializers.CharField(max_length=50)
    Amount = serializers.CharField(max_length=20)
    destinationPhone = serializers.CharField(max_length=20)
    mobileNumber = serializers.CharField(max_length=20)
    RIB = serializers.CharField(max_length=30)


class TransferOTPSerializer(serializers.Serializer):
    """4.8.2 - Transfer OTP generation input."""
    PhoneNumber = serializers.CharField(max_length=20)


class TransferConfirmationSerializer(serializers.Serializer):
    """4.8.3 - Transfer confirmation input."""
    mobileNumber = serializers.CharField(max_length=20)
    ContractId = serializers.CharField(max_length=50)
    Otp = serializers.CharField(max_length=10)
    referenceId = serializers.CharField(max_length=20)
    destinationPhone = serializers.CharField(max_length=20)
    fees = serializers.CharField(max_length=20, required=False, default='0')
    Amount = serializers.CharField(max_length=20)
    RIB = serializers.CharField(max_length=30)
    NumBeneficiaire = serializers.CharField(max_length=20, required=False, default='')
    DestinationFirstName = serializers.CharField(max_length=100, required=False, default='')
    DestinationLastName = serializers.CharField(max_length=100, required=False, default='')


# ═══════════════════════════════════════════════════════════════
# 4.9  ATM Withdrawal
# ═══════════════════════════════════════════════════════════════

class ATMSimulationSerializer(serializers.Serializer):
    """4.9.1 - ATM withdrawal simulation input."""
    ContractId = serializers.CharField(max_length=50)
    Amount = serializers.CharField(max_length=20)


class ATMOTPSerializer(serializers.Serializer):
    """4.9.2 - ATM withdrawal OTP generation input."""
    phoneNumber = serializers.CharField(max_length=20)


class ATMConfirmationSerializer(serializers.Serializer):
    """4.9.3 - ATM withdrawal confirmation input."""
    ContractId = serializers.CharField(max_length=50)
    PhoneNumberBeneficiary = serializers.CharField(max_length=20)
    Token = serializers.CharField(max_length=50)
    ReferenceId = serializers.CharField(max_length=20)
    Otp = serializers.CharField(max_length=10)


# ═══════════════════════════════════════════════════════════════
# 4.10  Wallet to Merchant
# ═══════════════════════════════════════════════════════════════

class W2MSimulationSerializer(serializers.Serializer):
    """4.10.1 - Wallet to Merchant simulation input."""
    clientNote = serializers.CharField(max_length=255, required=False, default='test', allow_blank=True)
    clientContractId = serializers.CharField(max_length=50)
    Amout = serializers.CharField(max_length=20)  # Note: typo matches API doc
    clientPhoneNumber = serializers.CharField(max_length=20)
    merchantPhoneNumber = serializers.CharField(max_length=20)


class W2MOTPSerializer(serializers.Serializer):
    """4.10.2 - Wallet to Merchant OTP generation input."""
    phoneNumber = serializers.CharField(max_length=20)


class W2MConfirmationSerializer(serializers.Serializer):
    """4.10.3 - Wallet to Merchant confirmation input."""
    ClientPhoneNumber = serializers.CharField(max_length=20)
    ClientContractId = serializers.CharField(max_length=50)
    OTP = serializers.CharField(max_length=10)
    ReferenceId = serializers.CharField(max_length=20)
    DestinationPhone = serializers.CharField(max_length=20)
    QrCode = serializers.CharField(max_length=100, required=False, default='')
    MCC = serializers.CharField(max_length=10, required=False, default='')
    AmountInputMode = serializers.CharField(max_length=20, required=False, default='ENTERED')
    fees = serializers.CharField(max_length=20, required=False, default='0')


# ═══════════════════════════════════════════════════════════════
# 4.11  Merchant Wallet Creation
# ═══════════════════════════════════════════════════════════════

class MerchantCreationSerializer(serializers.Serializer):
    """4.11.1 - Merchant wallet pre-creation input."""
    FirstName = serializers.CharField(max_length=100)
    LastName = serializers.CharField(max_length=100)
    MobileNumber = serializers.CharField(max_length=20)
    Provider = serializers.CharField(max_length=20, required=False, default='IAM')
    Email = serializers.EmailField(required=False, default='', allow_blank=True)
    NumberOfChildren = serializers.CharField(max_length=5, required=False, default='0')
    Profession = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    AverageIncome = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)
    ActivitySector = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    ActivityType = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    Gender = serializers.CharField(max_length=10, required=False, default='', allow_blank=True)
    IdentificationDocumentType = serializers.CharField(max_length=20, required=False, default='CIN')
    IdentificationNumber = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    IdentificationExpiryDate = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)
    PlaceOfBirth = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    DateOfBirth = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)
    LandlineNumber = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)
    AddressLine1 = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
    AddressLine2 = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
    City = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    JobPosition = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    Nationality = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    PostalCode = serializers.CharField(max_length=10, required=False, default='', allow_blank=True)
    Country = serializers.CharField(max_length=50, required=False, default='MAROC', allow_blank=True)
    CompanyName = serializers.CharField(max_length=200, required=False, default='', allow_blank=True)
    BusinessAddress = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
    CommercialRegistrationNumber = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    TaxIdentificationNumber = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    CompanyRegistrationId = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    TradeLicenseNumber = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    MerchantCategory = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    ProfessionalTaxNumber = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    RegistrationCenter = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    LegalStructure = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)
    RegistryRegistrationNumber = serializers.CharField(max_length=50, required=False, default='', allow_blank=True)


class MerchantActivationSerializer(serializers.Serializer):
    """4.11.2 - Merchant wallet activation input."""
    Token = serializers.CharField(max_length=50)
    Otp = serializers.CharField(max_length=10)


# ═══════════════════════════════════════════════════════════════
# 4.12  Merchant to Merchant
# ═══════════════════════════════════════════════════════════════

class M2MSimulationSerializer(serializers.Serializer):
    """4.12.1 - Merchant to Merchant simulation input."""
    ClientNote = serializers.CharField(max_length=255, required=False, default='M2M', allow_blank=True)
    ContractId = serializers.CharField(max_length=50)
    Amount = serializers.CharField(max_length=20)
    DestinationPhone = serializers.CharField(max_length=20)
    MobileNumber = serializers.CharField(max_length=20)


class M2MOTPSerializer(serializers.Serializer):
    """4.12.2 - Merchant to Merchant OTP generation input."""
    phoneNumber = serializers.CharField(max_length=20)


class M2MConfirmationSerializer(serializers.Serializer):
    """4.12.3 - Merchant to Merchant confirmation input."""
    MobileNumber = serializers.CharField(max_length=20)
    ContractId = serializers.CharField(max_length=50)
    Otp = serializers.CharField(max_length=10)
    ReferenceId = serializers.CharField(max_length=20)


# ═══════════════════════════════════════════════════════════════
# 4.13  Dynamic QR Code
# ═══════════════════════════════════════════════════════════════

class DynamicQRCodeSerializer(serializers.Serializer):
    """4.13 - Dynamic QR code generation input."""
    phoneNumber = serializers.CharField(max_length=20)
    contractId = serializers.CharField(max_length=50)
    amount = serializers.CharField(max_length=20)


# ═══════════════════════════════════════════════════════════════
# 4.14  Merchant to Wallet
# ═══════════════════════════════════════════════════════════════

class M2WSimulationSerializer(serializers.Serializer):
    """4.14.1 - Merchant to Wallet simulation input."""
    ContractId = serializers.CharField(max_length=50)
    Amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    BeneficiaryPhoneNumber = serializers.CharField(max_length=20)


class M2WOTPSerializer(serializers.Serializer):
    """4.14.2 - Merchant to Wallet OTP generation input."""
    phoneNumber = serializers.CharField(max_length=20)


class M2WConfirmationSerializer(serializers.Serializer):
    """4.14.3 - Merchant to Wallet confirmation input."""
    ContractId = serializers.CharField(max_length=50)
    BeneficiaryPhoneNumber = serializers.CharField(max_length=20)
    Amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    Otp = serializers.CharField(max_length=10)


# ═══════════════════════════════════════════════════════════════
# 4.15  User Survey
# ═══════════════════════════════════════════════════════════════

class UserSurveyPostSerializer(serializers.Serializer):
    phoneNumber = serializers.CharField(max_length=20)
    digitalPlatforms = serializers.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    rent = serializers.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    groceries = serializers.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    utilities = serializers.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    entertainment = serializers.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    transportation = serializers.DecimalField(max_digits=12, decimal_places=2, default=0.0)
