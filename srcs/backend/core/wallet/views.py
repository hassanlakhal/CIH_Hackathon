import base64
import random
import string
from decimal import Decimal, InvalidOperation
from datetime import datetime
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import (
    Wallet, Transaction, userSurvey,
    SavingsGoal, MonthlySavingRecord, AutoSavingRule, WalletInsight, FinancialHealthScore,
)
from .serializers import (
    WalletPreRegistrationSerializer, WalletActivationSerializer,
    ClientInfoSerializer,
    CashInSimulationSerializer, CashInConfirmationSerializer,
    CashOutSimulationSerializer, CashOutConfirmationSerializer,
    W2WSimulationSerializer, W2WConfirmationSerializer,
    TransferSimulationSerializer, TransferConfirmationSerializer,
    ATMSimulationSerializer, ATMConfirmationSerializer,
    W2MSimulationSerializer, W2MConfirmationSerializer,
    MerchantCreationSerializer, MerchantActivationSerializer,
    M2MSimulationSerializer, M2MConfirmationSerializer,
    DynamicQRCodeSerializer,
    M2WSimulationSerializer, M2WConfirmationSerializer, UserSurveyPostSerializer,
    SavingsGoalCreateSerializer, SavingsGoalUpdateSerializer,
    AutoSavingRuleCreateSerializer, WalletInsightTriggerSerializer,
    WalletSettingsUpdateSerializer,
)
from .ai_engine import generate_wallet_insight, process_auto_save_on_transaction
import requests
from django.conf import settings
from django.core.mail import send_mail, EmailMessage

def _safe_decimal(value, default='0'):
    """Safely convert a value to Decimal."""
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return Decimal(default)


@api_view(['POST'])
def wallet_create(request):
    """
    POST /wallet?state=precreate  → Wallet pre-registration
    POST /wallet?state=activate   → Wallet activation
    """
    state = request.query_params.get('state', '').strip()

    if state == 'precreate':
        return _wallet_precreate(request)
    elif state == 'activate':
        return _wallet_activate(request)
    else:
        return Response(
            {'error': 'Invalid or missing "state" query parameter. Use ?state=precreate or ?state=activate'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _wallet_precreate(request):
    """4.1.1 - Wallet pre-registration."""
    serializer = WalletPreRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = Wallet.generate_token('TR')
    otp = Wallet.generate_otp()
    try:
        wallet = Wallet.objects.create(
            phone_number=data['phoneNumber'].strip(),
            provider=data.get('phoneOperator', 'IAM'),
            first_name=data.get('clientFirstName', ''),
            last_name=data.get('clientLastName', ''),
            email=data.get('email', ''),
            place_of_birth=data.get('placeOfBirth', ''),
            date_of_birth=data.get('dateOfBirth', ''),
            address_line1=data.get('clientAddress', ''),
            gender=data.get('gender', ''),
            legal_type=data.get('legalType', ''),
            legal_id=data.get('legalId', ''),
            token=token,
            otp=otp,
            wallet_type='CUSTOMER',
            status='PENDING',
        )
        
        if wallet.email:
            msg = EmailMessage(
                subject='Mind Save Activation Code',
                body=f'Welcome to Mind Save!\n\nYour activation code is: {otp}\n\nPlease enter this code to activate your account.',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@mindesave.com'),
                to=[wallet.email],
                cc=[getattr(settings, 'DEFAULT_FROM_EMAIL', '')],
                reply_to=[getattr(settings, 'DEFAULT_FROM_EMAIL', '')]
            )
            msg.send(fail_silently=False)
        return Response({
            'result': {
                'activityArea': None,
                'addressLine1': wallet.address_line1,
                'addressLine2': None,
                'addressLine3': None,
                'addressLine4': None,
                'agenceId': wallet.agence_id,
                'averageIncome': None,
                'birthDay': None,
                'channelId': wallet.channel_id,
                'city': None,
                'country': None,
                'dateOfBirth': wallet.date_of_birth,
                'distributeurId': wallet.distributeur_id,
                'documentExpiryDate1': None,
                'documentExpiryDate2': None,
                'documentScan1': '',
                'documentScan2': '',
                'documentType1': wallet.legal_type,
                'documentType2': None,
                'email': wallet.email,
                'familyStatus': None,
                'firstName': wallet.first_name or 'Prenom',
                'fonction': None,
                'gender': wallet.gender,
                'institutionId': wallet.institution_id,
                'landLineNumber': None,
                'lastName': wallet.last_name or 'nom',
                'legalId1': wallet.legal_id,
                'legalId2': None,
                'level': None,
                'mailaddress': None,
                'mobileNumber': wallet.phone_number,
                'nationalite': None,
                'numberofchildren': None,
                'optField1': None,
                'optField2': None,
                'phoneNumber': None,
                'placeOfBirth': wallet.place_of_birth,
                'postCode': None,
                'productId': wallet.product_id,
                'productTypeId': wallet.product_type_id,
                'profession': None,
                'provider': wallet.provider,
                'raisonSocial': None,
                'region': None,
                'registrationDate': None,
                'title': None,
                'token': token,
                'otp': otp
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': f'Error {e}'})

def _wallet_activate(request):
    """4.1.2 - Wallet activation."""
    serializer = WalletActivationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = data['token'].strip()
    otp = data['otp'].strip()

    try:
        wallet = Wallet.objects.get(token=token)
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found for the given token.'}, status=status.HTTP_404_NOT_FOUND)

    if wallet.otp != otp:
        return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    wallet.contract_id = Wallet.generate_contract_id()
    wallet.rib = Wallet.generate_rib()
    wallet.status = 'ACTIVE'
    wallet.level = '000'
    wallet.save()

    return Response({
        'result': {
            'contractId': wallet.contract_id,
            'reference': '',
            'level': wallet.level,
            'rib': wallet.rib,
        }
    }, status=status.HTTP_200_OK)



@api_view(['POST'])
def client_info(request):
    """POST /wallet/clientinfo - View a customer's profile."""
    serializer = ClientInfoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    phone = data['phoneNumber'].strip()

    wallets = Wallet.objects.filter(phone_number=phone, status='ACTIVE')
    if not wallets.exists():
        return Response({'error': 'No active wallet found for this phone number.'}, status=status.HTTP_404_NOT_FOUND)

    wallet = wallets.first()

    products = []
    for w in wallets:
        products.append({
            'abbreviation': None,
            'contractId': w.contract_id,
            'description': None,
            'email': w.email,
            'level': w.level,
            'name': w.product_name,
            'phoneNumber': w.phone_number,
            'productTypeId': w.product_type_id,
            'productTypeName': w.product_type_name,
            'provider': w.provider,
            'rib': w.rib,
            'solde': str(w.balance),
            'statusId': '1' if w.status == 'ACTIVE' else '0',
            'tierType': '03',
            'uid': '000',
        })

    # Cumulated balance
    total_balance = sum(w.balance for w in wallets)

    return Response({
        'result': {
            'adressLine1': wallet.address_line1,
            'city': wallet.city,
            'contractId': None,
            'country': wallet.country,
            'description': None,
            'email': wallet.email,
            'numberOfChildren': wallet.number_of_children,
            'phoneNumber': wallet.phone_number,
            'pidNUmber': None,
            'pidType': wallet.legal_type,
            'products': products,
            'radical': '',
            'soldeCumule': str(total_balance),
            'statusId': None,
            'tierFirstName': wallet.first_name or 'Prenom',
            'tierId': wallet.token,
            'tierLastName': wallet.last_name or 'nom',
            'userName': None,
            'familyStatus': wallet.family_status,
        }
    })


@api_view(['GET'])
def operations_history(request):
    """GET /wallet/operations?contractid=X - Retrieve transaction history."""
    contract_id = request.query_params.get('contractid', '').strip()
    if not contract_id:
        return Response({'error': 'contractid query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

    transactions = Transaction.objects.filter(
        source_contract_id=contract_id, status='CONFIRMED'
    ) | Transaction.objects.filter(
        destination_phone__isnull=False, source_contract_id=contract_id
    )
    transactions = transactions.order_by('-created_at')

    results = []
    for txn in transactions:
        results.append({
            'amount': str(txn.amount),
            'Fees': str(txn.fees),
            'beneficiaryFirstName': txn.beneficiary_first_name or 'Prenom',
            'beneficiaryLastName': txn.beneficiary_last_name or 'nom',
            'beneficiaryRIB': txn.destination_rib or None,
            'clientNote': txn.client_note or txn.api_type_code,
            'contractId': None,
            'currency': txn.currency,
            'date': txn.created_at.strftime('%m/%d/%Y %I:%M:%S %p') if txn.created_at else '',
            'dateToCompare': '0001-01-01T00:00:00Z',
            'frais': [],
            'numTel': None,
            'operation': None,
            'referenceId': txn.reference_id,
            'sign': None,
            'srcDestNumber': txn.destination_phone,
            'status': '000',
            'totalAmount': str(txn.total_amount),
            'totalFrai': str(txn.total_fees),
            'type': txn.api_type_code,
            'isCanceled': txn.status == 'CANCELLED',
            'isTierCashIn': False,
            'totalPage': max(1, transactions.count()),
        })

    if not results:
        results = [{
            'amount': '0.00',
            'Fees': '0',
            'beneficiaryFirstName': 'N/A',
            'beneficiaryLastName': 'N/A',
            'beneficiaryRIB': None,
            'clientNote': '',
            'contractId': None,
            'currency': 'MAD',
            'date': datetime.now().strftime('%m/%d/%Y %I:%M:%S %p'),
            'dateToCompare': '0001-01-01T00:00:00Z',
            'frais': [],
            'numTel': None,
            'operation': None,
            'referenceId': '',
            'sign': None,
            'srcDestNumber': '',
            'status': '000',
            'totalAmount': '0.00',
            'totalFrai': '0.00',
            'type': '',
            'isCanceled': False,
            'isTierCashIn': False,
            'totalPage': 0,
        }]

    return Response({'result': results})


@api_view(['GET'])
def wallet_balance(request):
    """GET /wallet/balance?contractid=X - Retrieve wallet balance."""
    contract_id = request.query_params.get('contractid', '').strip()
    if not contract_id:
        return Response({'error': 'contractid query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet = Wallet.objects.get(contract_id=contract_id)
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'result': {
            'balance': [
                {'value': str(wallet.balance).replace('.', ',')}
            ]
        }
    })


@api_view(['POST'])
def cash_in(request):
    """
    POST /wallet/cash/in?step=simulation    → Cash IN Simulation
    POST /wallet/cash/in?step=confirmation  → Cash IN Confirmation
    """
    step = request.query_params.get('step', '').strip()

    if step == 'simulation':
        return _cash_in_simulation(request)
    elif step == 'confirmation':
        return _cash_in_confirmation(request)
    else:
        return Response(
            {'error': 'Invalid or missing "step" query parameter. Use ?step=simulation or ?step=confirmation'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _cash_in_simulation(request):
    """4.5.1 - Cash IN Simulation."""
    serializer = CashInSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = _safe_decimal(data['amount'])
    fees = _safe_decimal(data.get('fees', '0'))
    token = Wallet.generate_transaction_token()
    ref_id = Wallet.generate_reference_id()

    # Look up wallet
    wallet = None
    try:
        wallet = Wallet.objects.get(contract_id=data['contractId'].strip())
    except Wallet.DoesNotExist:
        pass

    txn = Transaction.objects.create(
        transaction_type='CASH_IN',
        status='SIMULATED',
        amount=amount,
        fees=fees,
        total_fees=fees,
        total_amount=amount,
        currency='MAD',
        reference_id=ref_id,
        token=token,
        transaction_id=f"20{datetime.now().strftime('%d%m%Y%H%M%S')}001",
        source_contract_id=data['contractId'].strip(),
        source_phone=data['phoneNumber'].strip(),
        source_wallet=wallet,
        beneficiary_first_name=wallet.first_name if wallet else 'Prenom',
        beneficiary_last_name=wallet.last_name if wallet else 'nom',
    )

    return Response({
        'result': {
            'Fees': str(fees),
            'feeDetail': f'[{{Nature:"COM",InvariantFee:{fees:.3f},VariantFee:0.0000000}}]',
            'token': token,
            'amountToCollect': float(amount),
            'isTier': True,
            'cardId': data['contractId'].strip(),
            'transactionId': txn.transaction_id,
            'benFirstName': txn.beneficiary_first_name or 'Prenom',
            'benLastName': txn.beneficiary_last_name or 'nom',
        }
    })


def _cash_in_confirmation(request):
    """4.5.2 - Cash IN Confirmation."""
    serializer = CashInConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = data['token'].strip()
    amount = _safe_decimal(data['amount'])
    fees = _safe_decimal(data.get('fees', '0'))

    try:
        txn = Transaction.objects.get(token=token, transaction_type='CASH_IN', status='SIMULATED')
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found or already confirmed.'}, status=status.HTTP_404_NOT_FOUND)

    # Credit the wallet
    if txn.source_wallet:
        txn.source_wallet.balance += amount
        txn.source_wallet.save()

    txn.status = 'CONFIRMED'
    txn.save()

    # ── Auto-save trigger on CASH_IN ──
    auto_saved = Decimal('0')
    if txn.source_wallet:
        auto_saved = process_auto_save_on_transaction(txn.source_wallet, amount)

    return Response({
        'result': {
            'Fees': str(fees),
            'feeDetails': None,
            'token': token,
            'amount': float(amount),
            'transactionReference': Wallet.generate_reference_id(),
            'optFieldOutput1': None,
            'optFieldOutput2': None,
            'cardId': txn.source_contract_id,
            'autoSaved': float(auto_saved),
        }
    })


@api_view(['POST'])
def cash_out(request):
    """
    POST /wallet/cash/out?step=simulation    → Cash OUT Simulation
    POST /wallet/cash/out?step=confirmation  → Cash OUT Confirmation
    """
    step = request.query_params.get('step', '').strip()

    if step == 'simulation':
        return _cash_out_simulation(request)
    elif step == 'confirmation':
        return _cash_out_confirmation(request)
    else:
        return Response(
            {'error': 'Invalid or missing "step" query parameter.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _cash_out_simulation(request):
    """4.6.1 - Cash OUT Simulation."""
    serializer = CashOutSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = _safe_decimal(data['amount'])
    fees = _safe_decimal(data.get('fees', '0'))
    token = Wallet.generate_transaction_token()

    wallet = None
    try:
        wallet = Wallet.objects.get(phone_number=data['phoneNumber'].strip(), status='ACTIVE')
    except Wallet.DoesNotExist:
        pass

    cash_out_max = float(wallet.balance) if wallet else 0

    txn = Transaction.objects.create(
        transaction_type='CASH_OUT',
        status='SIMULATED',
        amount=amount,
        fees=fees,
        total_fees=fees,
        total_amount=amount,
        token=token,
        transaction_id=f"20{datetime.now().strftime('%d%m%Y%H%M%S')}001",
        source_phone=data['phoneNumber'].strip(),
        source_wallet=wallet,
        source_contract_id=wallet.contract_id if wallet else '',
    )

    return Response({
        'result': {
            'Fees': str(fees),
            'token': token,
            'amountToCollect': float(amount),
            'cashOut_Max': cash_out_max,
            'optFieldOutput1': None,
            'optFieldOutput2': None,
            'cardId': wallet.contract_id if wallet else '',
            'transactionId': txn.transaction_id,
            'feeDetail': f'[{{Nature:"COM",InvariantFee:{fees:.3f},VariantFee:0.0000000}}]',
        }
    })



def _cash_out_confirmation(request):
    """4.6.3 - Cash OUT Confirmation."""
    serializer = CashOutConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = data['token'].strip()
    amount = _safe_decimal(data['amount'])
    fees = _safe_decimal(data.get('fees', '0'))

    try:
        txn = Transaction.objects.get(token=token, transaction_type='CASH_OUT')
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

    if txn.status != 'SIMULATED':
        return Response({'error': 'Transaction already processed.'}, status=status.HTTP_400_BAD_REQUEST)

    # Debit the wallet
    if txn.source_wallet:
        txn.source_wallet.balance -= amount
        txn.source_wallet.save()

    txn.status = 'CONFIRMED'
    txn.save()

    return Response({
        'result': {
            'Fees': str(fees),
            'feeDetails': None,
            'token': token,
            'amount': float(amount),
            'transactionReference': Wallet.generate_reference_id(),
            'optFieldOutput1': None,
            'optFieldOutput2': None,
            'cardId': txn.source_contract_id,
        }
    })


@api_view(['POST'])
def wallet_to_wallet(request):
    """
    POST /wallet/transfer/wallet?step=simulation    → W2W Simulation
    POST /wallet/transfer/wallet?step=confirmation  → W2W Confirmation
    """
    step = request.query_params.get('step', '').strip()

    if step == 'simulation':
        return _w2w_simulation(request)
    elif step == 'confirmation':
        return _w2w_confirmation(request)
    else:
        return Response(
            {'error': 'Invalid or missing "step" query parameter.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _w2w_simulation(request):
    """4.7.1 - Wallet to Wallet Simulation."""
    serializer = W2WSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = _safe_decimal(data['amout'])  # Note: typo matches API doc
    fees = _safe_decimal(data.get('fees', '0'))
    ref_id = Wallet.generate_reference_id()

    # Calculate fees (mock: COM=5, TVA=1)
    com_fee = Decimal('5.00')
    tva_fee = Decimal('1.00')
    total_fees = com_fee + tva_fee
    total_amount = amount + total_fees

    # Look up destination wallet
    dest_wallet = None
    try:
        dest_wallet = Wallet.objects.get(phone_number=data['destinationPhone'].strip(), status='ACTIVE')
    except Wallet.DoesNotExist:
        pass

    src_wallet = None
    try:
        src_wallet = Wallet.objects.get(contract_id=data['contractId'].strip())
    except Wallet.DoesNotExist:
        pass

    txn = Transaction.objects.create(
        transaction_type='W2W',
        status='SIMULATED',
        amount=amount,
        fees=fees,
        total_fees=total_fees,
        total_amount=total_amount,
        reference_id=ref_id,
        token=Wallet.generate_transaction_token(),
        source_contract_id=data['contractId'].strip(),
        source_phone=data['mobileNumber'].strip(),
        source_wallet=src_wallet,
        destination_phone=data['destinationPhone'].strip(),
        destination_wallet=dest_wallet,
        beneficiary_first_name=dest_wallet.first_name if dest_wallet else 'Prenom',
        beneficiary_last_name=dest_wallet.last_name if dest_wallet else 'nom',
        client_note=data.get('clentNote', 'W2W'),
    )

    return Response({
        'result': {
            'amount': str(amount),
            'Fees': str(fees),
            'beneficiaryFirstName': txn.beneficiary_first_name,
            'beneficiaryLastName': txn.beneficiary_last_name,
            'beneficiaryRIB': None,
            'contractId': None,
            'currency': None,
            'date': None,
            'dateToCompare': '0001-01-01T00:00:00Z',
            'frais': [
                {
                    'currency': 'MAD',
                    'fullName': '',
                    'name': 'COM',
                    'referenceId': ref_id,
                    'value': float(com_fee),
                },
                {
                    'currency': 'MAD',
                    'fullName': '',
                    'name': 'TVA',
                    'referenceId': ref_id,
                    'value': float(tva_fee),
                },
            ],
            'numTel': None,
            'operation': None,
            'referenceId': ref_id,
            'sign': None,
            'srcDestNumber': None,
            'status': None,
            'totalAmount': str(total_amount),
            'totalFrai': str(total_fees),
            'type': 'TT',
            'isCanceled': False,
            'isTierCashIn': False,
        }
    })



def _w2w_confirmation(request):
    """4.7.3 - Wallet to Wallet Confirmation."""
    serializer = W2WConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    ref_id = data['referenceId'].strip()

    try:
        txn = Transaction.objects.get(reference_id=ref_id, transaction_type='W2W')
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Debit source, credit destination
    if txn.source_wallet:
        txn.source_wallet.balance -= txn.total_amount
        txn.source_wallet.save()
    if txn.destination_wallet:
        txn.destination_wallet.balance += txn.amount
        txn.destination_wallet.save()

    txn.status = 'CONFIRMED'
    txn.save()

    new_balance = txn.source_wallet.balance if txn.source_wallet else Decimal('0')

    return Response({
        'result': {
            'item1': {
                'creditAmounts': None,
                'debitAmounts': None,
                'depot': None,
                'retrait': None,
                'value': str(new_balance),
            },
            'item2': '000',
            'item3': 'Successful',
        }
    })


@api_view(['POST'])
def transfer_virement(request):
    """
    POST /wallet/transfer/virement?step=simulation    → Transfer Simulation
    POST /wallet/transfer/virement?step=confirmation  → Transfer Confirmation
    """
    step = request.query_params.get('step', '').strip()

    if step == 'simulation':
        return _transfer_simulation(request)
    elif step == 'confirmation':
        return _transfer_confirmation(request)
    else:
        return Response(
            {'error': 'Invalid or missing "step" query parameter.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _transfer_simulation(request):
    """4.8.1 - Transfer Simulation."""
    serializer = TransferSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = _safe_decimal(data['Amount'])
    ref_id = Wallet.generate_reference_id()

    src_wallet = None
    try:
        src_wallet = Wallet.objects.get(contract_id=data['ContractId'].strip())
    except Wallet.DoesNotExist:
        pass

    Transaction.objects.create(
        transaction_type='TRANSFER',
        status='SIMULATED',
        amount=amount,
        fees=Decimal('0'),
        total_fees=Decimal('0'),
        total_amount=amount,
        reference_id=ref_id,
        token=Wallet.generate_transaction_token(),
        source_contract_id=data['ContractId'].strip(),
        source_phone=data['mobileNumber'].strip(),
        source_wallet=src_wallet,
        destination_phone=data['destinationPhone'].strip(),
        destination_rib=data['RIB'].strip(),
        client_note=data.get('clientNote', 'W2W'),
    )

    return Response({
        'result': [{
            'frais': '0',
            'fraisSms': None,
            'totalAmountWithFee': str(amount),
            'deviseEmissionCode': None,
            'fraisInclus': False,
            'montantDroitTimbre': 0,
            'montantFrais': 0,
            'montantFraisSMS': 0,
            'montantFraisTotal': 0,
            'montantTVA': 0,
            'montantTVASMS': 0,
            'tauxChange': 0,
        }]
    })



def _transfer_confirmation(request):
    """4.8.3 - Transfer Confirmation."""
    serializer = TransferConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    contract_id = data['ContractId'].strip()
    ref_id = data['referenceId'].strip()

    try:
        txn = Transaction.objects.get(
            source_contract_id=contract_id,
            transaction_type='TRANSFER',
        )
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Debit source wallet
    if txn.source_wallet:
        txn.source_wallet.balance -= txn.amount
        txn.source_wallet.save()

    txn.status = 'CONFIRMED'
    txn.beneficiary_first_name = data.get('DestinationFirstName', '')
    txn.beneficiary_last_name = data.get('DestinationLastName', '')
    txn.save()

    return Response({
        'result': {
            'contractId': contract_id,
            'reference': Wallet.generate_reference_id() + Wallet.generate_reference_id()[:2],
        }
    })


@api_view(['POST'])
def atm_withdrawal(request):
    """
    POST /wallet/cash/gab/out?step=simulation    → ATM Simulation
    POST /wallet/cash/gab/out?step=confirmation  → ATM Confirmation
    """
    step = request.query_params.get('step', '').strip()

    if step == 'simulation':
        return _atm_simulation(request)
    elif step == 'confirmation':
        return _atm_confirmation(request)
    else:
        return Response(
            {'error': 'Invalid or missing "step" query parameter.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _atm_simulation(request):
    """4.9.1 - ATM Withdrawal Simulation."""
    serializer = ATMSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = _safe_decimal(data['Amount'])
    token = Wallet.generate_transaction_token()
    ref_id = Wallet.generate_reference_id()

    # Mock fees
    com_fee = Decimal('3.00')
    tva_rate = Decimal('0.27')
    total_fees = com_fee
    total_amount = amount + total_fees

    src_wallet = None
    try:
        src_wallet = Wallet.objects.get(contract_id=data['ContractId'].strip())
    except Wallet.DoesNotExist:
        pass

    Transaction.objects.create(
        transaction_type='ATM',
        status='SIMULATED',
        amount=amount,
        fees=com_fee,
        total_fees=total_fees,
        total_amount=total_amount,
        token=token,
        reference_id=ref_id,
        source_contract_id=data['ContractId'].strip(),
        source_wallet=src_wallet,
    )

    return Response({
        'result': {
            'totalFrai': str(total_fees),
            'feeDetails': f'[{{Nature:"COM",InvariantFee:{com_fee:.3f},VariantFee:0.0000000}},{{Nature:"TVA",InvariantFee:0.000,VariantFee:{tva_rate}}}]',
            'token': token,
            'totalAmount': float(total_amount),
            'referenceId': ref_id,
        }
    })



def _atm_confirmation(request):
    """4.9.3 - ATM Withdrawal Confirmation."""
    serializer = ATMConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = data['Token'].strip()
    contract_id = data['ContractId'].strip()

    try:
        txn = Transaction.objects.get(token=token, transaction_type='ATM')
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Debit wallet
    if txn.source_wallet:
        txn.source_wallet.balance -= txn.total_amount
        txn.source_wallet.save()

    txn.status = 'CONFIRMED'
    txn.save()

    new_token = Wallet.generate_transaction_token()
    now = datetime.now()
    cih_ref = f"00{now.strftime('%y%m%d%H%M%S%f')[:20]}"

    return Response({
        'result': {
            'fee': '0.00',
            'feeDetails': None,
            'token': new_token,
            'amount': float(txn.amount),
            'transactionReference': '',
            'cardId': contract_id,
            'transactionId': int(Wallet.generate_reference_id()),
            'transfertCihExpressReference': cih_ref,
            'redCode': None,
            'greenCode': None,
        }
    })


@api_view(['POST'])
def wallet_to_merchant(request):
    """
    POST /wallet/Transfer/WalletToMerchant?step=simulation    → W2M Simulation
    POST /wallet/Transfer/WalletToMerchant?step=confirmation  → W2M Confirmation
    """
    step = request.query_params.get('step', '').strip()

    if step == 'simulation':
        return _w2m_simulation(request)
    elif step == 'confirmation':
        return _w2m_confirmation(request)
    else:
        return Response(
            {'error': 'Invalid or missing "step" query parameter.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _w2m_simulation(request):
    """4.10.1 - Wallet to Merchant Simulation."""
    serializer = W2MSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = _safe_decimal(data['Amout'])  # Note: typo matches API doc
    ref_id = Wallet.generate_reference_id()

    # Look up merchant wallet
    merchant = None
    try:
        merchant = Wallet.objects.get(
            phone_number=data['merchantPhoneNumber'].strip(), wallet_type='MERCHANT', status='ACTIVE'
        )
    except Wallet.DoesNotExist:
        pass

    src_wallet = None
    try:
        src_wallet = Wallet.objects.get(contract_id=data['clientContractId'].strip())
    except Wallet.DoesNotExist:
        pass

    Transaction.objects.create(
        transaction_type='W2M',
        status='SIMULATED',
        amount=amount,
        fees=Decimal('0'),
        total_fees=Decimal('0'),
        total_amount=amount,
        reference_id=ref_id,
        source_contract_id=data['clientContractId'].strip(),
        source_phone=data['clientPhoneNumber'].strip(),
        source_wallet=src_wallet,
        destination_phone=data['merchantPhoneNumber'].strip(),
        destination_wallet=merchant,
        beneficiary_first_name=merchant.first_name if merchant else 'Merchant',
        beneficiary_last_name=merchant.last_name if merchant else 'Name',
        client_note=data.get('clientNote', 'test'),
    )

    return Response({
        'result': {
            'amount': str(amount),
            'beneficiaryFirstName': merchant.first_name if merchant else 'Merchant',
            'beneficiaryLastName': merchant.last_name if merchant else 'Name',
            'beneficiaryRIB': None,
            'clientNote': data.get('clientNote', 'test'),
            'contractId': None,
            'currency': None,
            'date': None,
            'dateToCompare': '0001-01-01T00:00:00Z',
            'frais': [],
            'numTel': None,
            'operation': None,
            'referenceId': ref_id,
            'sign': None,
            'srcDestNumber': None,
            'status': None,
            'totalAmount': str(amount),
            'totalFrai': '0',
            'type': 'TM',
            'isCanceled': False,
            'isTierCashIn': False,
            'feeDetails': None,
            'token': None,
            'optFieldOutput1': None,
            'optFieldOutput2': None,
            'cardId': None,
            'isSwitch': False,
        }
    })



def _w2m_confirmation(request):
    """4.10.3 - Wallet to Merchant Confirmation."""
    serializer = W2MConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    ref_id = data['ReferenceId'].strip()

    try:
        txn = Transaction.objects.get(reference_id=ref_id, transaction_type='W2M')
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Debit source, credit merchant
    if txn.source_wallet:
        txn.source_wallet.balance -= txn.amount
        txn.source_wallet.save()
    if txn.destination_wallet:
        txn.destination_wallet.balance += txn.amount
        txn.destination_wallet.save()

    txn.status = 'CONFIRMED'
    txn.qr_code = data.get('QrCode', '')
    txn.mcc = data.get('MCC', '')
    txn.amount_input_mode = data.get('AmountInputMode', 'ENTERED')
    txn.save()

    # ── Auto-save trigger on W2M (merchant receives) ──
    if txn.destination_wallet:
        process_auto_save_on_transaction(txn.destination_wallet, txn.amount)

    new_balance = txn.source_wallet.balance if txn.source_wallet else Decimal('0')

    return Response({
        'result': {
            'item1': {
                'creditAmounts': None,
                'debitAmounts': None,
                'depot': None,
                'retrait': None,
                'value': str(new_balance),
                'transactionId': None,
                'cardId': None,
                'optFieldOutput2': None,
                'optFieldOutput1': None,
                'transactionReference': None,
                'amount': None,
                'token': None,
                'fee': None,
                'feeDetails': None,
            },
            'item2': '000',
            'item3': 'Successful',
        }
    })



@api_view(['POST'])
def merchant_create(request):
    """POST /merchants - Merchant wallet pre-creation."""
    serializer = MerchantCreationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = Wallet.generate_token('ME')
    otp = Wallet.generate_otp()

    Wallet.objects.create(
        phone_number=data['MobileNumber'].strip(),
        provider=data.get('Provider', 'IAM'),
        first_name=data['FirstName'],
        last_name=data['LastName'],
        email=data.get('Email', ''),
        gender=data.get('Gender', ''),
        place_of_birth=data.get('PlaceOfBirth', ''),
        date_of_birth=data.get('DateOfBirth', ''),
        address_line1=data.get('AddressLine1', ''),
        address_line2=data.get('AddressLine2', ''),
        city=data.get('City', ''),
        country=data.get('Country', 'MAROC'),
        postal_code=data.get('PostalCode', ''),
        nationality=data.get('Nationality', ''),
        number_of_children=int(data.get('NumberOfChildren', 0)) if data.get('NumberOfChildren') else None,
        profession=data.get('Profession', ''),
        average_income=data.get('AverageIncome', ''),
        legal_type=data.get('IdentificationDocumentType', 'CIN'),
        legal_id=data.get('IdentificationNumber', ''),
        document_expiry_date=data.get('IdentificationExpiryDate', ''),
        landline_number=data.get('LandlineNumber', ''),
        job_position=data.get('JobPosition', ''),
        company_name=data.get('CompanyName', ''),
        business_address=data.get('BusinessAddress', ''),
        commercial_registration=data.get('CommercialRegistrationNumber', ''),
        tax_id=data.get('TaxIdentificationNumber', ''),
        company_registration_id=data.get('CompanyRegistrationId', ''),
        trade_license=data.get('TradeLicenseNumber', ''),
        merchant_category=data.get('MerchantCategory', ''),
        professional_tax_number=data.get('ProfessionalTaxNumber', ''),
        registration_center=data.get('RegistrationCenter', ''),
        legal_structure=data.get('LegalStructure', ''),
        registry_registration_number=data.get('RegistryRegistrationNumber', ''),
        activity_sector=data.get('ActivitySector', ''),
        activity_type=data.get('ActivityType', ''),
        wallet_type='MERCHANT',
        token=token,
        otp=otp,
        status='PENDING',
        product_type_name='MERCHANT',
    )
    
    if data.get('Email'):
        msg = EmailMessage(
            subject='Mind Save Merchant Activation',
            body=f'Welcome to Mind Save Merchant!\n\nYour activation code is: {otp}\n\nPlease enter this code to activate your merchant account.',
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@mindesave.com'),
            to=[data.get('Email')],
            cc=[getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@mindesave.com')],
            reply_to=[getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@mindesave.com')]
        )
        msg.send(fail_silently=False)

    return Response({
        'result': {'token': token}
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def merchant_activate(request):
    """POST /merchant/activate - Merchant wallet activation."""
    serializer = MerchantActivationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = data['Token'].strip()
    otp = data['Otp'].strip()

    try:
        wallet = Wallet.objects.get(token=token, wallet_type='MERCHANT')
    except Wallet.DoesNotExist:
        return Response({'error': 'Merchant wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

    if wallet.otp != otp:
        return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    wallet.contract_id = Wallet.generate_contract_id()
    wallet.rib = Wallet.generate_rib()
    wallet.status = 'ACTIVE'
    wallet.save()

    return Response({
        'result': {'contractId': wallet.contract_id}
    })


@api_view(['POST'])
def m2m_simulation(request):
    """4.12.1 - POST /merchant/transaction/simulation - M2M Simulation."""
    serializer = M2MSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = _safe_decimal(data['Amount'])
    ref_id = Wallet.generate_reference_id()

    # Mock fees
    com_fee = Decimal('3.33')
    tva_fee = Decimal('0.67')
    total_fees = com_fee + tva_fee

    dest_wallet = None
    try:
        dest_wallet = Wallet.objects.get(
            phone_number=data['DestinationPhone'].strip(), wallet_type='MERCHANT', status='ACTIVE'
        )
    except Wallet.DoesNotExist:
        pass

    src_wallet = None
    try:
        src_wallet = Wallet.objects.get(contract_id=data['ContractId'].strip())
    except Wallet.DoesNotExist:
        pass

    Transaction.objects.create(
        transaction_type='M2M',
        status='SIMULATED',
        amount=amount,
        fees=Decimal('0'),
        total_fees=total_fees,
        total_amount=amount,
        reference_id=ref_id,
        token=Wallet.generate_transaction_token(),
        source_contract_id=data['ContractId'].strip(),
        source_phone=data['MobileNumber'].strip(),
        source_wallet=src_wallet,
        destination_phone=data['DestinationPhone'].strip(),
        destination_wallet=dest_wallet,
        beneficiary_first_name=dest_wallet.first_name if dest_wallet else 'Merchant',
        beneficiary_last_name=dest_wallet.last_name if dest_wallet else 'Name',
        client_note=data.get('ClientNote', 'M2M'),
    )

    return Response({
        'result': [{
            'amount': str(amount),
            'beneficiaryFirstName': dest_wallet.first_name if dest_wallet else 'Merchant',
            'beneficiaryLastName': dest_wallet.last_name if dest_wallet else 'Name',
            'beneficiaryRIB': None,
            'clientNote': data.get('ClientNote', 'M2M'),
            'contractId': None,
            'currency': None,
            'date': None,
            'dateToCompare': '0001-01-01T00:00:00Z',
            'frais': [
                {
                    'currency': 'MAD',
                    'fullName': '',
                    'name': 'COM',
                    'referenceId': ref_id,
                    'value': float(com_fee),
                },
                {
                    'currency': 'MAD',
                    'fullName': '',
                    'name': 'TVA',
                    'referenceId': ref_id,
                    'value': float(tva_fee),
                },
            ],
            'numTel': None,
            'operation': None,
            'referenceId': ref_id,
            'sign': None,
            'srcDestNumber': None,
            'status': None,
            'totalAmount': str(amount),
            'totalFrai': str(total_fees),
            'type': 'CC',
            'isCanceled': False,
            'isTierCashIn': False,
            'walletType': '',
        }]
    })



@api_view(['POST'])
def m2m_confirmation(request):
    """4.12.3 - POST /merchant/transaction/confirmation - M2M Confirmation."""
    serializer = M2MConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    ref_id = data['ReferenceId'].strip()

    try:
        txn = Transaction.objects.get(reference_id=ref_id, transaction_type='M2M')
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Debit source merchant, credit destination merchant
    if txn.source_wallet:
        txn.source_wallet.balance -= txn.amount
        txn.source_wallet.save()
    if txn.destination_wallet:
        txn.destination_wallet.balance += txn.amount
        txn.destination_wallet.save()

    txn.status = 'CONFIRMED'
    txn.save()

    new_balance = txn.source_wallet.balance if txn.source_wallet else Decimal('0')

    return Response({
        'result': {
            'creditAmounts': None,
            'debitAmounts': None,
            'depot': None,
            'retrait': None,
            'value': str(new_balance),
        }
    })

@api_view(['POST'])
def checkcheck(request):
    token = request.data.get('token')
    try:
        Wallet.objects.get(token=token)
        return Response(status=status.HTTP_200_OK)
    except:
        return Response(status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
def dynamic_qr_code(request):
    """POST /wallet/pro/qrcode/dynamic - Generate a dynamic QR code."""
    serializer = DynamicQRCodeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    now = datetime.now()
    token = now.strftime('%d%m%Y%H%M%S') + Wallet.generate_reference_id()[:7]

    # Generate a mock QR code payload
    phone = data['phoneNumber'].strip()
    contract_id = data['contractId'].strip()
    amount = data['amount'].strip()

    # Mock base64 content (small placeholder PNG)
    qr_text = f"CIH_WALLET|{phone}|{contract_id}|{amount}|{token}"
    mock_base64 = base64.b64encode(qr_text.encode()).decode()

    # Build a mock binary content similar to the API doc
    binary_parts = [
        f"000201010212",
        f"0520{amount}",
        f"5802MA",
        f"5907Epicier",
        f"6010Casablanca",
    ]
    mock_binary = ''.join(binary_parts)

    # Look up merchant wallet
    merchant = None
    try:
        merchant = Wallet.objects.get(contract_id=contract_id, wallet_type='MERCHANT')
    except Wallet.DoesNotExist:
        pass

    return Response({
        'result': {
            'phoneNumber': phone,
            'reference': '',
            'token': token,
            'base64Content': mock_base64,
            'binaryContent': mock_binary,
        }
    })


@api_view(['POST'])
def m2w_simulation(request):
    """4.14.1 - POST /merchant/merchantToWallet/simulation - M2W Simulation."""
    serializer = M2WSimulationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    amount = Decimal(str(data['Amount']))

    src_wallet = None
    try:
        src_wallet = Wallet.objects.get(contract_id=data['ContractId'].strip())
    except Wallet.DoesNotExist:
        pass

    dest_wallet = None
    try:
        dest_wallet = Wallet.objects.get(
            phone_number=data['BeneficiaryPhoneNumber'].strip(), status='ACTIVE'
        )
    except Wallet.DoesNotExist:
        pass

    Transaction.objects.create(
        transaction_type='M2W',
        status='SIMULATED',
        amount=amount,
        fees=Decimal('0'),
        total_fees=Decimal('0'),
        total_amount=amount,
        reference_id=Wallet.generate_reference_id(),
        token=Wallet.generate_transaction_token(),
        source_contract_id=data['ContractId'].strip(),
        source_wallet=src_wallet,
        destination_phone=data['BeneficiaryPhoneNumber'].strip(),
        destination_wallet=dest_wallet,
    )

    return Response({
        'result': {
            'amount': float(amount),
            'feeAmount': 0.0,
        }
    })



@api_view(['POST'])
def m2w_confirmation(request):
    """4.14.3 - POST /merchant/merchantToWallet/confirmation - M2W Confirmation."""
    serializer = M2WConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    contract_id = data['ContractId'].strip()
    amount = Decimal(str(data['Amount']))

    try:
        txn = Transaction.objects.filter(
            source_contract_id=contract_id, transaction_type='M2W',
        ).exclude(status='CONFIRMED').latest('created_at')
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Debit merchant, credit destination wallet
    if txn.source_wallet:
        txn.source_wallet.balance -= amount
        txn.source_wallet.save()
    if txn.destination_wallet:
        txn.destination_wallet.balance += amount
        txn.destination_wallet.save()

    txn.status = 'CONFIRMED'
    txn.save()

    return Response({
        'result': {
            'contractId': None,
            'reference': Wallet.generate_reference_id() + '54',
            'transferAmount': 0,
        }
    })


@api_view(['POST', 'GET'])
def survey_view(request):
    """
    POST /wallet/survey - Post user survey for needs
    GET /wallet/survey?phoneNumber=X - Get user survey needs
    """
    if request.method == 'POST':
        token = request.data.get('token')
        serializer = UserSurveyPostSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            wallet = Wallet.objects.get(token=token)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        survey = userSurvey.objects.create(
            theWallet=wallet,
            digitalPlatforms=data.get('digitalPlatforms', Decimal('0.00')),
            rent=data.get('rent', Decimal('0.00')),
            groceries=data.get('groceries', Decimal('0.00')),
            utilities=data.get('utilities', Decimal('0.00')),
            entertainment=data.get('entertainment', Decimal('0.00')),
            transportation=data.get('transportation', Decimal('0.00'))
        )
        
        wallet.isSurveyNeed = True
        wallet.save()
        
        return Response({'message': 'Survey submitted successfully.'}, status=status.HTTP_201_CREATED)

    elif request.method == 'GET':
        phone = request.query_params.get('token')
        if not phone:
            return Response({'error': 'token query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            wallet = Wallet.objects.get(phone_number=phone)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        surveys = userSurvey.objects.filter(theWallet=wallet)
        if not surveys.exists():
            return Response({
                'isSurveyNeed': wallet.isSurveyNeed,
                'survey': None
            })
            
        latest_survey = surveys.order_by('-created_at').first()
        
        return Response({
            'isSurveyNeed': wallet.isSurveyNeed,
            'survey': {
                'id': latest_survey.id,
                'createdAt': latest_survey.created_at,
                'digitalPlatforms': float(latest_survey.digitalPlatforms),
                'rent': float(latest_survey.rent),
                'groceries': float(latest_survey.groceries),
                'utilities': float(latest_survey.utilities),
                'entertainment': float(latest_survey.entertainment),
                'transportation': float(latest_survey.transportation),
            }
        })


# ═══════════════════════════════════════════════════════════════
# 5.0  AI Financial Coaching — Wallet Insight
# ═══════════════════════════════════════════════════════════════

@api_view(['POST', 'GET'])
def wallet_insight(request):
    """
    POST /wallet/insight - Trigger AI analysis, store insight + health score + monthly record
    GET  /wallet/insight?token=X - Retrieve latest insight + goal states
    """
    if request.method == 'POST':
        serializer = WalletInsightTriggerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token'].strip()
        try:
            wallet = Wallet.objects.get(token=token)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

        from datetime import date, timedelta
        from django.db.models import Q
        
        thirty_days_ago = date.today() - timedelta(days=30)
        recent_txns_count = Transaction.objects.filter(
            Q(source_wallet=wallet) | Q(destination_wallet=wallet),
            status='CONFIRMED',
            created_at__gte=thirty_days_ago,
        ).count()
        survey_exists = userSurvey.objects.filter(theWallet=wallet).exists()

        if recent_txns_count < 3 and not survey_exists:
            wallet.isSurveyNeed = True
            wallet.save()
            return Response({'result': {'survey_required': True}})

        wallet.isSurveyNeed = False
        wallet.save()

        # Generate the AI insight
        insight = generate_wallet_insight(wallet)

        # Build response
        goals = SavingsGoal.objects.filter(wallet=wallet, status='ACTIVE')
        goals_data = [{
            'id': g.id,
            'title': g.title,
            'target_amount': float(g.target_amount),
            'current_saved': float(g.current_saved),
            'target_date': g.target_date.isoformat(),
            'predicted_completion_date': g.predicted_completion_date.isoformat() if g.predicted_completion_date else None,
            'monthly_needed': float(g.monthly_needed),
            'priority': g.priority,
            'status': g.status,
            'progress': float(g.current_saved / g.target_amount) if g.target_amount > 0 else 0,
        } for g in goals]

        return Response({
            'result': {
                'insight': _serialize_insight(insight),
                'goals': goals_data,
            }
        }, status=status.HTTP_201_CREATED)

    elif request.method == 'GET':
        token = request.query_params.get('token', '').strip()
        if not token:
            return Response({'error': 'token query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wallet = Wallet.objects.get(token=token)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

        insight = WalletInsight.objects.filter(wallet=wallet).first()
        if not insight:
            return Response({
                'result': {
                    'insight': None,
                    'goals': [],
                    'message': 'No insight generated yet. Trigger POST /wallet/insight first.'
                }
            })

        goals = SavingsGoal.objects.filter(wallet=wallet).exclude(status='ABANDONED')
        goals_data = [{
            'id': g.id,
            'title': g.title,
            'target_amount': float(g.target_amount),
            'current_saved': float(g.current_saved),
            'target_date': g.target_date.isoformat(),
            'predicted_completion_date': g.predicted_completion_date.isoformat() if g.predicted_completion_date else None,
            'monthly_needed': float(g.monthly_needed),
            'priority': g.priority,
            'status': g.status,
            'progress': float(g.current_saved / g.target_amount) if g.target_amount > 0 else 0,
        } for g in goals]

        return Response({
            'result': {
                'insight': _serialize_insight(insight),
                'goals': goals_data,
            }
        })


def _serialize_insight(insight):
    """Helper to serialize a WalletInsight instance."""
    return {
        'id': insight.id,
        'month': insight.month.isoformat(),
        'generated_at': insight.generated_at.isoformat(),
        'total_income_last_month': float(insight.total_income_last_month),
        'total_expenses_last_month': float(insight.total_expenses_last_month),
        'net_savings_last_month': float(insight.net_savings_last_month),
        'savings_rate_pct': float(insight.savings_rate_pct),
        'estimated_income_this_month': float(insight.estimated_income_this_month),
        'estimated_expenses_this_month': float(insight.estimated_expenses_this_month),
        'recommended_saving_this_month': float(insight.recommended_saving_this_month),
        'safety_floor_recommendation': float(insight.safety_floor_recommendation),
        'predicted_goal_date': insight.predicted_goal_date.isoformat() if insight.predicted_goal_date else None,
        'goal_on_track': insight.goal_on_track,
        'income_sources': insight.income_sources,
        'expense_categories': insight.expense_categories,
        'necessary_expenses': insight.necessary_expenses,
        'optional_expenses': insight.optional_expenses,
        'saving_opportunities': insight.saving_opportunities,
        'summary_message': insight.summary_message,
        'tip': insight.tip,
        'warning': insight.warning,
        'health_score': insight.health_score,
        'health_score_delta': insight.health_score_delta,
    }


# ═══════════════════════════════════════════════════════════════
# 5.1  AI Financial Coaching — Savings Goals
# ═══════════════════════════════════════════════════════════════

@api_view(['POST', 'GET'])
def savings_goals(request):
    """
    POST /wallet/goals - Create a savings goal
    GET  /wallet/goals?token=X - List all goals with progress
    """
    if request.method == 'POST':
        serializer = SavingsGoalCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        token = data['token'].strip()

        try:
            wallet = Wallet.objects.get(token=token)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

        goal = SavingsGoal.objects.create(
            wallet=wallet,
            title=data['title'],
            description=data.get('description', ''),
            target_amount=data['target_amount'],
            target_date=data['target_date'],
            priority=data.get('priority', 'MEDIUM'),
        )
        goal.recalculate_monthly_needed()
        goal.save()

        # Update wallet goal field for backward compatibility
        wallet.goal = int(data['target_amount'])
        wallet.goalDescription = data['title']
        wallet.save()

        return Response({
            'result': {
                'id': goal.id,
                'title': goal.title,
                'target_amount': float(goal.target_amount),
                'current_saved': float(goal.current_saved),
                'target_date': goal.target_date.isoformat(),
                'monthly_needed': float(goal.monthly_needed),
                'priority': goal.priority,
                'status': goal.status,
                'progress': 0,
            }
        }, status=status.HTTP_201_CREATED)

    elif request.method == 'GET':
        token = request.query_params.get('token', '').strip()
        if not token:
            return Response({'error': 'token query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wallet = Wallet.objects.get(token=token)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

        goals = SavingsGoal.objects.filter(wallet=wallet).exclude(status='ABANDONED')
        goals_data = [{
            'id': g.id,
            'title': g.title,
            'description': g.description,
            'target_amount': float(g.target_amount),
            'current_saved': float(g.current_saved),
            'target_date': g.target_date.isoformat(),
            'predicted_completion_date': g.predicted_completion_date.isoformat() if g.predicted_completion_date else None,
            'monthly_needed': float(g.monthly_needed),
            'priority': g.priority,
            'status': g.status,
            'auto_allocate_pct': float(g.auto_allocate_pct),
            'progress': float(g.current_saved / g.target_amount) if g.target_amount > 0 else 0,
            'created_at': g.created_at.isoformat(),
        } for g in goals]

        return Response({
            'result': {
                'goals': goals_data,
                'safety_floor': wallet.safetyFloor,
                'total_goal': wallet.goal,
            }
        })


@api_view(['PATCH'])
def savings_goal_detail(request, goal_id):
    """
    PATCH /wallet/goals/<id> - Update goal (pause, change target, etc.)
    """
    serializer = SavingsGoalUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    token = data['token'].strip()

    try:
        wallet = Wallet.objects.get(token=token)
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        goal = SavingsGoal.objects.get(id=goal_id, wallet=wallet)
    except SavingsGoal.DoesNotExist:
        return Response({'error': 'Goal not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Apply updates
    if 'title' in data:
        goal.title = data['title']
    if 'description' in data:
        goal.description = data['description']
    if 'target_amount' in data:
        goal.target_amount = data['target_amount']
    if 'target_date' in data:
        goal.target_date = data['target_date']
    if 'priority' in data:
        goal.priority = data['priority']
    if 'status' in data:
        goal.status = data['status']

    goal.recalculate_monthly_needed()
    goal.save()

    return Response({
        'result': {
            'id': goal.id,
            'title': goal.title,
            'target_amount': float(goal.target_amount),
            'current_saved': float(goal.current_saved),
            'target_date': goal.target_date.isoformat(),
            'predicted_completion_date': goal.predicted_completion_date.isoformat() if goal.predicted_completion_date else None,
            'monthly_needed': float(goal.monthly_needed),
            'priority': goal.priority,
            'status': goal.status,
            'progress': float(goal.current_saved / goal.target_amount) if goal.target_amount > 0 else 0,
        }
    })


# ═══════════════════════════════════════════════════════════════
# 5.2  AI Financial Coaching — Auto-Saving Rules
# ═══════════════════════════════════════════════════════════════

@api_view(['POST', 'GET'])
def auto_save_rules(request):
    """
    POST /wallet/auto-save - Create an auto-saving rule
    GET  /wallet/auto-save?token=X - List all auto-saving rules
    """
    if request.method == 'POST':
        serializer = AutoSavingRuleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        token = data['token'].strip()

        try:
            wallet = Wallet.objects.get(token=token)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Optionally tie to a specific goal
        goal = None
        if data.get('goal_id'):
            try:
                goal = SavingsGoal.objects.get(id=data['goal_id'], wallet=wallet)
            except SavingsGoal.DoesNotExist:
                return Response({'error': 'Goal not found.'}, status=status.HTTP_404_NOT_FOUND)

        rule = AutoSavingRule.objects.create(
            wallet=wallet,
            goal=goal,
            rule_type=data['rule_type'],
            value=data['value'],
        )

        return Response({
            'result': {
                'id': rule.id,
                'rule_type': rule.rule_type,
                'value': float(rule.value),
                'is_active': rule.is_active,
                'goal_id': goal.id if goal else None,
                'goal_title': goal.title if goal else None,
                'total_auto_saved': float(rule.total_auto_saved),
            }
        }, status=status.HTTP_201_CREATED)

    elif request.method == 'GET':
        token = request.query_params.get('token', '').strip()
        if not token:
            return Response({'error': 'token query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wallet = Wallet.objects.get(token=token)
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

        rules = AutoSavingRule.objects.filter(wallet=wallet)
        rules_data = [{
            'id': r.id,
            'rule_type': r.rule_type,
            'value': float(r.value),
            'is_active': r.is_active,
            'goal_id': r.goal_id,
            'goal_title': r.goal.title if r.goal else None,
            'total_auto_saved': float(r.total_auto_saved),
            'created_at': r.created_at.isoformat(),
        } for r in rules]

        return Response({
            'result': {
                'rules': rules_data,
            }
        })


# ═══════════════════════════════════════════════════════════════
# 5.3  AI Financial Coaching — Financial Health Score
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
def health_scores(request):
    """
    GET /wallet/health?token=X - Get health score history (sparkline data)
    """
    token = request.query_params.get('token', '').strip()
    if not token:
        return Response({'error': 'token query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet = Wallet.objects.get(token=token)
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

    scores = FinancialHealthScore.objects.filter(wallet=wallet).order_by('month')[:12]
    scores_data = [{
        'month': s.month.isoformat(),
        'score': s.score,
        'savings_rate_score': s.savings_rate_score,
        'goal_progress_score': s.goal_progress_score,
        'stability_score': s.stability_score,
        'label': s.label,
    } for s in scores]

    # Latest score for quick display
    latest = scores_data[-1] if scores_data else None

    return Response({
        'result': {
            'scores': scores_data,
            'current': {
                'score': latest['score'] if latest else 0,
                'label': latest['label'] if latest else 'GOOD',
                'delta': latest['score'] - (scores_data[-2]['score'] if len(scores_data) >= 2 else latest['score']) if latest else 0,
            } if latest else None,
        }
    })


# ═══════════════════════════════════════════════════════════════
# 6.0  Wallet Settings (Savings Account, Safety Floor)
# ═══════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def wallet_settings(request):
    """
    GET /wallet/settings?token=X - Retrieve savings settings
    POST /wallet/settings - Update savings settings
    """
    if request.method == 'GET':
        token = request.query_params.get('token', '').strip()
        if not token:
            return Response({'error': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            wallet = Wallet.objects.get(token=token)
            return Response({
                'safetyFloor': wallet.safetyFloor,
                'sendToSavingAccount': wallet.sendToSavingAccount,
                'monthlySavingAmount': str(wallet.monthlySavingAmount),
                'savingTriggerBalance': str(wallet.savingTriggerBalance),
                'savingAccountBalance': str(wallet.savingAccountBalance),
            })
        except Wallet.DoesNotExist:
            return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)
            
    # POST
    serializer = WalletSettingsUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        wallet = Wallet.objects.get(token=data['token'].strip())
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found.'}, status=status.HTTP_404_NOT_FOUND)

    if 'safetyFloor' in data:
        wallet.safetyFloor = data['safetyFloor']
    if 'sendToSavingAccount' in data:
        wallet.sendToSavingAccount = data['sendToSavingAccount']
    if 'monthlySavingAmount' in data:
        wallet.monthlySavingAmount = _safe_decimal(data['monthlySavingAmount'])
    if 'savingTriggerBalance' in data:
        wallet.savingTriggerBalance = _safe_decimal(data['savingTriggerBalance'])

    wallet.save()
    return Response({
        'result': 'Settings updated successfully',
        'safetyFloor': wallet.safetyFloor,
        'sendToSavingAccount': wallet.sendToSavingAccount,
        'monthlySavingAmount': str(wallet.monthlySavingAmount),
        'savingTriggerBalance': str(wallet.savingTriggerBalance),
    })
