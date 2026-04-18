# 🏦 CIH Wallet Management KIT — API Documentation

> Complete reference for all mock wallet & merchant endpoints.
> **Base URL:** `http://localhost:8000/api`
> **Format:** JSON · **Encoding:** UTF-8

---

## Table of Contents

| # | Endpoint | Section |
|---|----------|---------|
| 4.1 | Wallet Creation | [Jump](#41---creating-a-wallet) |
| 4.2 | Client Info | [Jump](#42---consulting-customer-information) |
| 4.3 | Transaction History | [Jump](#43---transaction-history) |
| 4.4 | Balance | [Jump](#44---balance-consultation) |
| 4.5 | Cash IN | [Jump](#45---cash-in) |
| 4.6 | Cash OUT | [Jump](#46---cash-out) |
| 4.7 | Wallet to Wallet | [Jump](#47---wallet-to-wallet) |
| 4.8 | Transfer / Virement | [Jump](#48---transfer-virement) |
| 4.9 | ATM Withdrawal | [Jump](#49---atm-withdrawal) |
| 4.10 | Wallet to Merchant | [Jump](#410---wallet-to-merchant) |
| 4.11 | Merchant Wallet Creation | [Jump](#411---creating-a-merchant-wallet) |
| 4.12 | Merchant to Merchant | [Jump](#412---merchant-to-merchant) |
| 4.13 | Dynamic QR Code | [Jump](#413---dynamic-qr-code) |
| 4.14 | Merchant to Wallet | [Jump](#414---merchant-to-wallet) |

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Invalid request / validation error |
| `404` | Not found |
| `500` | Server error |

---

## 4.1 - Creating a Wallet

Wallet creation is a **two-step** process:

### 4.1.1 — Pre-registration

Creates a pending wallet and returns an OTP + token for activation.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/?state=precreate` |

**Request Body:**
```json
{
  "phoneNumber": "212700446631",
  "phoneOperator": "IAM",
  "clientFirstName": "Hassan",
  "clientLastName": "Lakhal",
  "email": "hassan@test.com",
  "placeOfBirth": "Casablanca",
  "dateOfBirth": "01011990",
  "clientAddress": "Rue 1, Casablanca",
  "gender": "M",
  "legalType": "CIN",
  "legalId": "BK123456"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/?state=precreate" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "212700446631",
    "phoneOperator": "IAM",
    "clientFirstName": "Hassan",
    "clientLastName": "Lakhal",
    "email": "hassan@test.com",
    "placeOfBirth": "Casablanca",
    "dateOfBirth": "01011990",
    "clientAddress": "Rue 1, Casablanca",
    "gender": "M",
    "legalType": "CIN",
    "legalId": "BK123456"
  }'
```

**Response (201 Created):**
```json
{
  "result": {
    "activityArea": null,
    "addressLine1": "Rue 1, Casablanca",
    "agenceId": "211",
    "channelId": "P",
    "dateOfBirth": "01011990",
    "distributeurId": "000104",
    "email": "hassan@test.com",
    "firstName": "Hassan",
    "gender": "M",
    "institutionId": "0001",
    "lastName": "Lakhal",
    "mobileNumber": "212700446631",
    "otp": "673407",
    "placeOfBirth": "Casablanca",
    "provider": "IAM",
    "token": "TR8543932276387712"
  }
}
```

> **Important:** Save the `otp` and `token` values — you need them for activation.

---

### 4.1.2 — Activation

Activates a pending wallet using the OTP and token from pre-registration.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/?state=activate` |

**Request Body:**
```json
{
  "otp": "673407",
  "token": "TR8543932276387712"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/?state=activate" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "673407",
    "token": "TR8543932276387712"
  }'
```

**Response (200 OK):**
```json
{
  "result": {
    "contractId": "LAN814819513542345",
    "reference": "",
    "level": "000",
    "rib": "574559804182880634475521"
  }
}
```

> **Important:** Save the `contractId` — it's used for all subsequent operations.

---

## 4.2 - Consulting Customer Information

View a customer's profile by phone number and ID.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/clientinfo` |

**Request Body:**
```json
{
  "phoneNumber": "212700446631",
  "identificationType": "CIN",
  "identificationNumber": "BK123456"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/clientinfo" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "212700446631",
    "identificationType": "CIN",
    "identificationNumber": "BK123456"
  }'
```

**Response (200 OK):**
```json
{
  "result": {
    "adressLine1": "Rue 1, Casablanca",
    "city": null,
    "country": "MAR",
    "email": "hassan@test.com",
    "phoneNumber": "212700446631",
    "products": [
      {
        "contractId": "LAN814819513542345",
        "name": "CDP BASIC",
        "productTypeName": "PARTICULIER",
        "provider": "IAM",
        "rib": "574559804182880634475521",
        "solde": "0.00",
        "statusId": "1"
      }
    ],
    "soldeCumule": "0.00",
    "tierFirstName": "Hassan",
    "tierLastName": "Lakhal"
  }
}
```

---

## 4.3 - Transaction History

Retrieve transaction history for a wallet by contract ID.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/wallet/operations?contractid={contractId}` |

**cURL:**
```bash
curl "http://localhost:8000/api/wallet/operations?contractid=LAN814819513542345"
```

**Response (200 OK):**
```json
{
  "result": [
    {
      "amount": "10.00",
      "Fees": "0",
      "beneficiaryFirstName": "Prenom",
      "beneficiaryLastName": "nom",
      "currency": "MAD",
      "date": "04/18/2026 12:30:00 PM",
      "referenceId": "1181798513",
      "status": "000",
      "totalAmount": "10.00",
      "totalFrai": "0.00",
      "type": "CI",
      "isCanceled": false
    }
  ]
}
```

---

## 4.4 - Balance Consultation

Retrieve wallet balance by contract ID.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/wallet/balance?contractid={contractId}` |

**cURL:**
```bash
curl "http://localhost:8000/api/wallet/balance?contractid=LAN814819513542345"
```

**Response (200 OK):**
```json
{
  "result": {
    "balance": [
      { "value": "12556,88" }
    ]
  }
}
```

---

## 4.5 - Cash IN

Fund a wallet in **two steps**: simulation → confirmation.

### 4.5.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/in?step=simulation` |

**Request Body:**
```json
{
  "contractId": "LAN814819513542345",
  "level": "2",
  "phoneNumber": "212700446631",
  "amount": "100",
  "fees": "0"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/cash/in?step=simulation" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "LAN814819513542345",
    "level": "2",
    "phoneNumber": "212700446631",
    "amount": "100",
    "fees": "0"
  }'
```

**Response (200 OK):**
```json
{
  "result": {
    "Fees": "0",
    "feeDetail": "[{Nature:\"COM\",InvariantFee:0.000,VariantFee:0.0000000}]",
    "token": "CFB6A53BFC5F44AA9EA07D413BC1F322",
    "amountToCollect": 100.0,
    "isTier": true,
    "cardId": "LAN814819513542345",
    "transactionId": "2018042026122250001",
    "benFirstName": "Hassan",
    "benLastName": "Lakhal"
  }
}
```

> **Important:** Save the `token` for confirmation.

### 4.5.2 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/in?step=confirmation` |

**Request Body:**
```json
{
  "token": "CFB6A53BFC5F44AA9EA07D413BC1F322",
  "amount": "100",
  "fees": "0"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/cash/in?step=confirmation" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "CFB6A53BFC5F44AA9EA07D413BC1F322",
    "amount": "100",
    "fees": "0"
  }'
```

**Response (200 OK):**
```json
{
  "result": {
    "Fees": "0",
    "feeDetails": null,
    "token": "CFB6A53BFC5F44AA9EA07D413BC1F322",
    "amount": 100.0,
    "transactionReference": "0288284881",
    "cardId": "LAN814819513542345"
  }
}
```

---

## 4.6 - Cash OUT

Withdraw funds from a wallet in **three steps**: simulation → OTP → confirmation.

### 4.6.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/out?step=simulation` |

**Request Body:**
```json
{
  "phoneNumber": "212700446631",
  "amount": "50",
  "fees": "0"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/cash/out?step=simulation" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "212700446631",
    "amount": "50",
    "fees": "0"
  }'
```

### 4.6.2 — OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/out/otp` |

**Request Body:**
```json
{
  "phoneNumber": "212700446631"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/cash/out/otp" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "212700446631"}'
```

**Response:**
```json
{
  "result": [{ "codeOtp": "771401" }]
}
```

### 4.6.3 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/out?step=confirmation` |

**Request Body:**
```json
{
  "token": "<token_from_simulation>",
  "phoneNumber": "212700446631",
  "otp": "771401",
  "amount": "50",
  "fees": "0"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/cash/out?step=confirmation" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token_from_simulation>",
    "phoneNumber": "212700446631",
    "otp": "771401",
    "amount": "50",
    "fees": "0"
  }'
```

---

## 4.7 - Wallet to Wallet

Transfer between two wallets in **three steps**: simulation → OTP → confirmation.

### 4.7.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/transfer/wallet?step=simulation` |

**Request Body:**
```json
{
  "clentNote": "W2W",
  "contractId": "LAN193541347060000000001",
  "amout": "2",
  "fees": "0",
  "destinationPhone": "212755123456",
  "mobileNumber": "212666233333"
}
```

> **Note:** `clentNote` and `amout` are intentional typos matching the original API spec.

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/transfer/wallet?step=simulation" \
  -H "Content-Type: application/json" \
  -d '{
    "clentNote": "W2W",
    "contractId": "LAN193541347060000000001",
    "amout": "2",
    "fees": "0",
    "destinationPhone": "212755123456",
    "mobileNumber": "212666233333"
  }'
```

### 4.7.2 — OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/transfer/wallet/otp` |

**Request Body:**
```json
{
  "phoneNumber": "212666233333"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/transfer/wallet/otp" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "212666233333"}'
```

### 4.7.3 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/transfer/wallet?step=confirmation` |

**Request Body:**
```json
{
  "mobileNumber": "212666233333",
  "contractId": "LAN193541347060000000001",
  "otp": "123456",
  "referenceId": "<referenceId_from_simulation>",
  "destinationPhone": "212755123456",
  "fees": "0"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/transfer/wallet?step=confirmation" \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "212666233333",
    "contractId": "LAN193541347060000000001",
    "otp": "123456",
    "referenceId": "<referenceId_from_simulation>",
    "destinationPhone": "212755123456",
    "fees": "0"
  }'
```

**Response:**
```json
{
  "result": {
    "item1": {
      "creditAmounts": null,
      "debitAmounts": null,
      "depot": null,
      "retrait": null,
      "value": "-245384.090"
    },
    "item2": "000",
    "item3": "Successful"
  }
}
```

---

## 4.8 - Transfer (Virement)

Bank transfer in **three steps**: simulation → OTP → confirmation.

### 4.8.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/transfer/virement?step=simulation` |

**Request Body:**
```json
{
  "clientNote": "W2W",
  "ContractId": "LAN252387936812761",
  "Amount": "12",
  "destinationPhone": "212665873350",
  "mobileNumber": "212669268097",
  "RIB": "230780530712622100950179"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/transfer/virement?step=simulation" \
  -H "Content-Type: application/json" \
  -d '{
    "clientNote": "W2W",
    "ContractId": "LAN252387936812761",
    "Amount": "12",
    "destinationPhone": "212665873350",
    "mobileNumber": "212669268097",
    "RIB": "230780530712622100950179"
  }'
```

### 4.8.2 — OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/transfer/virement/otp` |

**Request Body:**
```json
{
  "PhoneNumber": "212669268097"
}
```

### 4.8.3 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/transfer/virement?step=confirmation` |

**Request Body:**
```json
{
  "mobileNumber": "212669268097",
  "ContractId": "LAN252387936812761",
  "Otp": "123456",
  "referenceId": "0152475499",
  "destinationPhone": "212665873350",
  "fees": "0",
  "Amount": "12",
  "RIB": "230780530712622100950179",
  "NumBeneficiaire": "212665873350",
  "DestinationFirstName": "test firstname",
  "DestinationLastName": "test lastname"
}
```

**Response:**
```json
{
  "result": {
    "contractId": "LAN252387936812761",
    "reference": "709846211156"
  }
}
```

---

## 4.9 - ATM Withdrawal

ATM withdrawal in **three steps**: simulation → OTP → confirmation.

### 4.9.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/gab/out?step=simulation` |

**Request Body:**
```json
{
  "ContractId": "LAN251276004694521",
  "Amount": "200"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/cash/gab/out?step=simulation" \
  -H "Content-Type: application/json" \
  -d '{
    "ContractId": "LAN251276004694521",
    "Amount": "200"
  }'
```

### 4.9.2 — OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/gab/otp` |

**Request Body:**
```json
{
  "phoneNumber": "0671219423"
}
```

### 4.9.3 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/cash/gab/out?step=confirmation` |

**Request Body:**
```json
{
  "ContractId": "LAN251276004694521",
  "PhoneNumberBeneficiary": "0671219423",
  "Token": "<token_from_simulation>",
  "ReferenceId": "<referenceId_from_simulation>",
  "Otp": "123456"
}
```

---

## 4.10 - Wallet to Merchant

Payment from wallet to merchant in **three steps**.

### 4.10.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/Transfer/WalletToMerchant?step=simulation` |

**Request Body:**
```json
{
  "clientNote": "test",
  "clientContractId": "LAN250383003224941",
  "Amout": "10",
  "clientPhoneNumber": "212665873350",
  "merchantPhoneNumber": "212657575733"
}
```

> **Note:** `Amout` is an intentional typo matching the original API spec.

### 4.10.2 — OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/walletToMerchant/cash/out/otp` |

**Request Body:**
```json
{
  "phoneNumber": "212665873350"
}
```

### 4.10.3 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/Transfer/WalletToMerchant?step=confirmation` |

**Request Body:**
```json
{
  "ClientPhoneNumber": "0612345678",
  "ClientContractId": "CONTRACT123",
  "OTP": "123456",
  "ReferenceId": "REF123456789",
  "DestinationPhone": "0698765432",
  "QrCode": "QR123456789",
  "MCC": "5411",
  "AmountInputMode": "ENTERED",
  "fees": "0"
}
```

---

## 4.11 - Creating a Merchant Wallet

Merchant wallet creation is a **two-step** process.

### 4.11.1 — Pre-creation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchants` |

**Request Body:**
```json
{
  "FirstName": "El",
  "LastName": "Ta",
  "MobileNumber": "0600000000",
  "Provider": "IAM",
  "Email": "el.ta@example.com",
  "NumberOfChildren": "4",
  "Profession": "Artisan",
  "AverageIncome": "50000",
  "ActivitySector": "Banking",
  "ActivityType": "Software",
  "Gender": "M",
  "IdentificationDocumentType": "CIN",
  "IdentificationNumber": "BK4444",
  "IdentificationExpiryDate": "31122030",
  "PlaceOfBirth": "Casablanca",
  "DateOfBirth": "20051985",
  "LandlineNumber": "0522222222",
  "AddressLine1": "Rue 1",
  "AddressLine2": "Appt 5",
  "City": "Rabat",
  "JobPosition": "Gérant",
  "Nationality": "Marocaine",
  "PostalCode": "10000",
  "Country": "MAROC",
  "CompanyName": "SARL ShoPech",
  "BusinessAddress": "Avenue des entreprises",
  "CommercialRegistrationNumber": "RC123456",
  "TaxIdentificationNumber": "IF789456",
  "CompanyRegistrationId": "ICE789123",
  "TradeLicenseNumber": "Lic123456",
  "MerchantCategory": "Retail",
  "ProfessionalTaxNumber": "TP789456",
  "RegistrationCenter": "Centre Rabat",
  "LegalStructure": "SARL",
  "RegistryRegistrationNumber": "RR123456"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/merchants" \
  -H "Content-Type: application/json" \
  -d '{
    "FirstName": "El",
    "LastName": "Ta",
    "MobileNumber": "0600000000",
    "Provider": "IAM",
    "Email": "el.ta@example.com",
    "Gender": "M",
    "IdentificationDocumentType": "CIN",
    "IdentificationNumber": "BK4444",
    "PlaceOfBirth": "Casablanca",
    "DateOfBirth": "20051985",
    "CompanyName": "SARL ShoPech",
    "MerchantCategory": "Retail"
  }'
```

**Response (201 Created):**
```json
{
  "result": {
    "token": "ME2519962089316801"
  }
}
```

### 4.11.2 — Activation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchant/activate` |

**Request Body:**
```json
{
  "Token": "ME2519962089316801",
  "Otp": "123456"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/merchant/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "Token": "ME2519962089316801",
    "Otp": "123456"
  }'
```

**Response:**
```json
{
  "result": {
    "contractId": "LAN251996372325421"
  }
}
```

> **Note:** Use the OTP returned from the pre-creation step (retrieve it from the database or logs for testing).

---

## 4.12 - Merchant to Merchant

Transfer between two merchants in **three steps**.

### 4.12.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchant/transaction/simulation` |

**Request Body:**
```json
{
  "ClientNote": "M2M",
  "ContractId": "LAN251114678086481",
  "Amount": "100",
  "DestinationPhone": "212645478824",
  "MobileNumber": "212758692536"
}
```

### 4.12.2 — OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchant/transaction/otp` |

**Request Body:**
```json
{
  "phoneNumber": "212758692536"
}
```

### 4.12.3 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchant/transaction/confirmation` |

**Request Body:**
```json
{
  "MobileNumber": "212758692536",
  "ContractId": "LAN251114678086481",
  "Otp": "123456",
  "ReferenceId": "<referenceId_from_simulation>"
}
```

**Response:**
```json
{
  "result": {
    "creditAmounts": null,
    "debitAmounts": null,
    "depot": null,
    "retrait": null,
    "value": "800.000"
  }
}
```

---

## 4.13 - Dynamic QR Code

Generate a QR code for merchant payment.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/wallet/pro/qrcode/dynamic` |

**Request Body:**
```json
{
  "phoneNumber": "21266587335",
  "contractId": "LAN250383003221",
  "amount": "100"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/wallet/pro/qrcode/dynamic" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "21266587335",
    "contractId": "LAN250383003221",
    "amount": "100"
  }'
```

**Response:**
```json
{
  "result": {
    "phoneNumber": "21266587335",
    "reference": "",
    "token": "050620251247094208472",
    "base64Content": "Q0lIX1dBTExFVHwyMTI2NjU4NzMzNTB8...",
    "binaryContent": "0002010102120520100..."
  }
}
```

---

## 4.14 - Merchant to Wallet

Transfer from merchant to customer wallet in **three steps**.

### 4.14.1 — Simulation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchant/merchantToWallet/simulation` |

**Request Body:**
```json
{
  "ContractId": "LAN251996372325421",
  "Amount": 15,
  "BeneficiaryPhoneNumber": "212600000554"
}
```

**cURL:**
```bash
curl -X POST "http://localhost:8000/api/merchant/merchantToWallet/simulation" \
  -H "Content-Type: application/json" \
  -d '{
    "ContractId": "LAN251996372325421",
    "Amount": 15,
    "BeneficiaryPhoneNumber": "212600000554"
  }'
```

**Response:**
```json
{
  "result": {
    "amount": 15.0,
    "feeAmount": 0.0
  }
}
```

### 4.14.2 — OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchant/otp/send` |

**Request Body:**
```json
{
  "phoneNumber": "212627248340"
}
```

**Response:**
```json
{
  "result": ""
}
```

### 4.14.3 — Confirmation

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/merchant/merchantToWallet/confirmation` |

**Request Body:**
```json
{
  "ContractId": "LAN251996372325421",
  "BeneficiaryPhoneNumber": "212600000554",
  "Amount": 15,
  "Otp": "123456"
}
```

**Response:**
```json
{
  "result": {
    "contractId": null,
    "reference": "17043695935454",
    "transferAmount": 0
  }
}
```

---

## 🧪 Full End-to-End Test Script

Use this script to test the full wallet lifecycle:

```bash
#!/bin/bash
# =============================================================
# CIH Wallet Management — Full E2E Test
# =============================================================
BASE="http://localhost:8000/api"

echo "══════════════════════════════════════════════════"
echo "  STEP 1: Create Customer Wallet (Pre-register)"
echo "══════════════════════════════════════════════════"
PRECREATE=$(curl -s -X POST "$BASE/wallet/?state=precreate" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "212611223344",
    "phoneOperator": "IAM",
    "clientFirstName": "Ahmed",
    "clientLastName": "Benali",
    "email": "ahmed@test.com",
    "gender": "M",
    "legalType": "CIN",
    "legalId": "AB112233"
  }')
echo "$PRECREATE" | python3 -m json.tool

OTP=$(echo "$PRECREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['otp'])")
TOKEN=$(echo "$PRECREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['token'])")
echo "→ OTP: $OTP | Token: $TOKEN"

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 2: Activate Wallet"
echo "══════════════════════════════════════════════════"
ACTIVATE=$(curl -s -X POST "$BASE/wallet/?state=activate" \
  -H "Content-Type: application/json" \
  -d "{\"otp\": \"$OTP\", \"token\": \"$TOKEN\"}")
echo "$ACTIVATE" | python3 -m json.tool

CONTRACT_ID=$(echo "$ACTIVATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['contractId'])")
echo "→ Contract ID: $CONTRACT_ID"

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 3: Check Balance (should be 0)"
echo "══════════════════════════════════════════════════"
curl -s "$BASE/wallet/balance?contractid=$CONTRACT_ID" | python3 -m json.tool

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 4: Cash IN — Simulate"
echo "══════════════════════════════════════════════════"
CASHIN_SIM=$(curl -s -X POST "$BASE/wallet/cash/in?step=simulation" \
  -H "Content-Type: application/json" \
  -d "{
    \"contractId\": \"$CONTRACT_ID\",
    \"level\": \"2\",
    \"phoneNumber\": \"212611223344\",
    \"amount\": \"500\",
    \"fees\": \"0\"
  }")
echo "$CASHIN_SIM" | python3 -m json.tool

CASHIN_TOKEN=$(echo "$CASHIN_SIM" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['token'])")
echo "→ Cash IN Token: $CASHIN_TOKEN"

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 5: Cash IN — Confirm"
echo "══════════════════════════════════════════════════"
curl -s -X POST "$BASE/wallet/cash/in?step=confirmation" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$CASHIN_TOKEN\",
    \"amount\": \"500\",
    \"fees\": \"0\"
  }" | python3 -m json.tool

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 6: Check Balance (should be 500)"
echo "══════════════════════════════════════════════════"
curl -s "$BASE/wallet/balance?contractid=$CONTRACT_ID" | python3 -m json.tool

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 7: Client Info"
echo "══════════════════════════════════════════════════"
curl -s -X POST "$BASE/wallet/clientinfo" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "212611223344",
    "identificationType": "CIN",
    "identificationNumber": "AB112233"
  }' | python3 -m json.tool

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 8: Transaction History"
echo "══════════════════════════════════════════════════"
curl -s "$BASE/wallet/operations?contractid=$CONTRACT_ID" | python3 -m json.tool

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 9: Create Merchant Wallet"
echo "══════════════════════════════════════════════════"
MERCHANT=$(curl -s -X POST "$BASE/merchants" \
  -H "Content-Type: application/json" \
  -d '{
    "FirstName": "Shop",
    "LastName": "Owner",
    "MobileNumber": "212699887766",
    "Provider": "INWI",
    "Email": "shop@test.com",
    "Gender": "M",
    "CompanyName": "TestShop SARL",
    "MerchantCategory": "Retail"
  }')
echo "$MERCHANT" | python3 -m json.tool

M_TOKEN=$(echo "$MERCHANT" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['token'])")
echo "→ Merchant Token: $M_TOKEN"

echo ""
echo "══════════════════════════════════════════════════"
echo "  STEP 10: QR Code Generation"
echo "══════════════════════════════════════════════════"
curl -s -X POST "$BASE/wallet/pro/qrcode/dynamic" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"212699887766\",
    \"contractId\": \"$CONTRACT_ID\",
    \"amount\": \"50\"
  }" | python3 -m json.tool

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ ALL TESTS COMPLETE"
echo "══════════════════════════════════════════════════"
```

---

## 📁 Project Structure

```
srcs/backend/core/
├── core/
│   ├── settings.py          # Django settings (rest_framework + wallet added)
│   └── urls.py              # Root URL config mounting wallet & merchant
├── wallet/                  # ← NEW: Wallet Management App
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py            # Wallet + Transaction models
│   ├── serializers.py       # Input validation serializers (30 serializers)
│   ├── views.py             # All API view handlers (31 endpoints)
│   ├── urls.py              # URL routing (wallet + merchant patterns)
│   ├── admin.py             # Django admin registrations
│   └── migrations/
│       └── 0001_initial.py
├── users/                   # Existing users app
└── manage.py
```

---

## 🔗 Complete Endpoint Map

| # | Method | URL | Query Params | Description |
|---|--------|-----|-------------|-------------|
| 4.1.1 | POST | `/api/wallet/` | `state=precreate` | Wallet pre-registration |
| 4.1.2 | POST | `/api/wallet/` | `state=activate` | Wallet activation |
| 4.2 | POST | `/api/wallet/clientinfo` | — | Client info lookup |
| 4.3 | GET | `/api/wallet/operations` | `contractid=X` | Transaction history |
| 4.4 | GET | `/api/wallet/balance` | `contractid=X` | Balance check |
| 4.5.1 | POST | `/api/wallet/cash/in` | `step=simulation` | Cash IN simulation |
| 4.5.2 | POST | `/api/wallet/cash/in` | `step=confirmation` | Cash IN confirmation |
| 4.6.1 | POST | `/api/wallet/cash/out` | `step=simulation` | Cash OUT simulation |
| 4.6.2 | POST | `/api/wallet/cash/out/otp` | — | Cash OUT OTP |
| 4.6.3 | POST | `/api/wallet/cash/out` | `step=confirmation` | Cash OUT confirmation |
| 4.7.1 | POST | `/api/wallet/transfer/wallet` | `step=simulation` | W2W simulation |
| 4.7.2 | POST | `/api/wallet/transfer/wallet/otp` | — | W2W OTP |
| 4.7.3 | POST | `/api/wallet/transfer/wallet` | `step=confirmation` | W2W confirmation |
| 4.8.1 | POST | `/api/wallet/transfer/virement` | `step=simulation` | Transfer simulation |
| 4.8.2 | POST | `/api/wallet/transfer/virement/otp` | — | Transfer OTP |
| 4.8.3 | POST | `/api/wallet/transfer/virement` | `step=confirmation` | Transfer confirmation |
| 4.9.1 | POST | `/api/wallet/cash/gab/out` | `step=simulation` | ATM simulation |
| 4.9.2 | POST | `/api/wallet/cash/gab/otp` | — | ATM OTP |
| 4.9.3 | POST | `/api/wallet/cash/gab/out` | `step=confirmation` | ATM confirmation |
| 4.10.1 | POST | `/api/wallet/Transfer/WalletToMerchant` | `step=simulation` | W2M simulation |
| 4.10.2 | POST | `/api/wallet/walletToMerchant/cash/out/otp` | — | W2M OTP |
| 4.10.3 | POST | `/api/wallet/Transfer/WalletToMerchant` | `step=confirmation` | W2M confirmation |
| 4.11.1 | POST | `/api/merchants` | — | Merchant pre-creation |
| 4.11.2 | POST | `/api/merchant/activate` | — | Merchant activation |
| 4.12.1 | POST | `/api/merchant/transaction/simulation` | — | M2M simulation |
| 4.12.2 | POST | `/api/merchant/transaction/otp` | — | M2M OTP |
| 4.12.3 | POST | `/api/merchant/transaction/confirmation` | — | M2M confirmation |
| 4.13 | POST | `/api/wallet/pro/qrcode/dynamic` | — | Dynamic QR code |
| 4.14.1 | POST | `/api/merchant/merchantToWallet/simulation` | — | M2W simulation |
| 4.14.2 | POST | `/api/merchant/otp/send` | — | M2W OTP |
| 4.14.3 | POST | `/api/merchant/merchantToWallet/confirmation` | — | M2W confirmation |

---

## 🔧 Running the Server

```bash
# Activate virtual environment
source env/bin/activate

# Navigate to Django project
cd srcs/backend/core

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver 0.0.0.0:8000
```

**Access the DRF Browsable API:** Open `http://localhost:8000/api/wallet/` in your browser.

---

## 💡 Key Notes

1. **Mock API**: All endpoints return realistic mock data backed by SQLite database persistence.
2. **No Authentication**: As per the hackathon spec, no token/auth is required.
3. **Multi-step Flows**: Operations like Cash IN, Cash OUT, W2W, etc. follow simulation → (OTP) → confirmation patterns. Values like `token` and `referenceId` from simulation must be passed to subsequent steps.
4. **Field Name Typos**: Some field names like `amout` (instead of `amount`) and `clentNote` (instead of `clientNote`) are intentional — they match the original CIH API spec exactly.
5. **Balance Updates**: Cash IN credits the wallet, Cash OUT/transfers debit the wallet. Balances are persisted in the database.
