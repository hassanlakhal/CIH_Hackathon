import base64
import random
import string
from decimal import Decimal, InvalidOperation
from datetime import datetime
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Wallet, Transaction
from .serializers import (
    WalletPreRegistrationSerializer, WalletActivationSerializer,
    ClientInfoSerializer,
    CashInSimulationSerializer, CashInConfirmationSerializer,
    CashOutSimulationSerializer, CashOutOTPSerializer, CashOutConfirmationSerializer,
    W2WSimulationSerializer, W2WOTPSerializer, W2WConfirmationSerializer,
    TransferSimulationSerializer, TransferOTPSerializer, TransferConfirmationSerializer,
    ATMSimulationSerializer, ATMOTPSerializer, ATMConfirmationSerializer,
    W2MSimulationSerializer, W2MOTPSerializer, W2MConfirmationSerializer,
    MerchantCreationSerializer, MerchantActivationSerializer,
    M2MSimulationSerializer, M2MOTPSerializer, M2MConfirmationSerializer,
    DynamicQRCodeSerializer,
    M2WSimulationSerializer, M2WOTPSerializer, M2WConfirmationSerializer, UserSurveyPostSerializer
)
import requests
from django.conf import settings

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
        url = "https://api.ng.termii.com/api/sms/send"
        payload = {
            "to": data['phoneNumber'].strip(),
            "from": "Mind Save",
            "sms": f"Your Mind Save activation code is: {otp}",
            "type": "plain",
            "channel": "generic",
            "api_key": settings.API_KEY_OTP
        }
        response = requests.post(url, json=payload)
        print(response.json())
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


@api_view(['POST'])
def cash_out_otp(request):
    """4.6.2 - POST /wallet/cash/out/otp - Generate OTP for Cash OUT."""
    serializer = CashOutOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = Wallet.generate_otp()

    # Store OTP on the latest pending cash-out transaction for this phone
    phone = serializer.validated_data['phoneNumber'].strip()
    txn = Transaction.objects.filter(
        source_phone=phone, transaction_type='CASH_OUT', status='SIMULATED'
    ).first()
    if txn:
        txn.otp = otp_code
        txn.status = 'OTP_SENT'
        txn.save()

    return Response({
        'result': [{'codeOtp': otp_code}]
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

    if txn.status not in ('SIMULATED', 'OTP_SENT'):
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


@api_view(['POST'])
def wallet_to_wallet_otp(request):
    """4.7.2 - POST /wallet/transfer/wallet/otp - Generate OTP for W2W."""
    serializer = W2WOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = Wallet.generate_otp()
    phone = serializer.validated_data['phoneNumber'].strip()

    txn = Transaction.objects.filter(
        source_phone=phone, transaction_type='W2W', status='SIMULATED'
    ).first()
    if txn:
        txn.otp = otp_code
        txn.status = 'OTP_SENT'
        txn.save()

    return Response({
        'result': [{'codeOtp': otp_code}]
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


@api_view(['POST'])
def transfer_virement_otp(request):
    """4.8.2 - POST /wallet/transfer/virement/otp - Send OTP for transfer."""
    serializer = TransferOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = Wallet.generate_otp()
    phone = serializer.validated_data['PhoneNumber'].strip()

    txn = Transaction.objects.filter(
        source_phone=phone, transaction_type='TRANSFER', status='SIMULATED'
    ).first()
    if txn:
        txn.otp = otp_code
        txn.status = 'OTP_SENT'
        txn.save()

    return Response({'result': otp_code})


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


@api_view(['POST'])
def atm_withdrawal_otp(request):
    """4.9.2 - POST /wallet/cash/gab/otp - Generate OTP for ATM withdrawal."""
    serializer = ATMOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = Wallet.generate_otp()

    return Response({
        'result': [{'codeOtp': otp_code}]
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


@api_view(['POST'])
def wallet_to_merchant_otp(request):
    """4.10.2 - POST /wallet/walletToMerchant/cash/out/otp - OTP for W2M."""
    serializer = W2MOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = Wallet.generate_otp()

    phone = serializer.validated_data['phoneNumber'].strip()
    txn = Transaction.objects.filter(
        source_phone=phone, transaction_type='W2M', status='SIMULATED'
    ).first()
    if txn:
        txn.otp = otp_code
        txn.status = 'OTP_SENT'
        txn.save()

    return Response({
        'result': [{'codeOtp': otp_code}]
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
def m2m_otp(request):
    """4.12.2 - POST /merchant/transaction/otp - M2M OTP generation."""
    serializer = M2MOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = Wallet.generate_otp()

    phone = serializer.validated_data['phoneNumber'].strip()
    txn = Transaction.objects.filter(
        source_phone=phone, transaction_type='M2M', status='SIMULATED'
    ).first()
    if txn:
        txn.otp = otp_code
        txn.status = 'OTP_SENT'
        txn.save()

    return Response({
        'result': [{'codeOtp': otp_code}]
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
def m2w_otp(request):
    """4.14.2 - POST /merchant/otp/send - Send OTP for M2W."""
    serializer = M2WOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = Wallet.generate_otp()

    # Store OTP on latest M2W transaction from merchant with this phone
    phone = serializer.validated_data['phoneNumber'].strip()
    wallet = Wallet.objects.filter(phone_number=phone).first()
    if wallet and wallet.contract_id:
        txn = Transaction.objects.filter(
            source_contract_id=wallet.contract_id, transaction_type='M2W', status='SIMULATED'
        ).first()
        if txn:
            txn.otp = otp_code
            txn.status = 'OTP_SENT'
            txn.save()

    return Response({'result': ''})


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
        serializer = UserSurveyPostSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        token = data['token'].strip()
        
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
        phone = request.query_params.get('phoneNumber', '').strip()
        if not phone:
            return Response({'error': 'phoneNumber query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
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
