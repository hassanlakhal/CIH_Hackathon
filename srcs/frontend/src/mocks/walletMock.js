/**
 * Mock data for the official Wallet Management KIT API responses.
 * These shapes match the official API documentation exactly.
 */

/** Simulated delay to mimic network latency */
const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Mock state ───────────────────────────────────────────────
const MOCK_CONTRACT_ID = 'WLT-2026-STU-00142';

// ─── Wallet pre-creation ─────────────────────────────────────
// POST /wallet?state=precreate
// Returns official-shaped response with result.otp and result.token
export async function mockPrecreateWallet(/* payload */) {
  await delay(800);
  return {
    result: {
      otp: '123456',
      token: 'TR2404781353895901',
      contractid: MOCK_CONTRACT_ID,
      state: 'precreated',
      message: 'Wallet pre-created successfully. Awaiting activation.',
    },
  };
}

// ─── Wallet activation ───────────────────────────────────────
// POST /wallet?state=activate
export async function mockActivateWallet(/* payload */) {
  await delay(800);
  return {
    result: {
      contractId: 'LAN240478508299911',
      reference: '',
      level: '000',
      rib: '853780241716465970216211',
    },
  };
}

// ─── Client info ─────────────────────────────────────────────
export async function mockGetClientInfo(/* payload */) {
  await delay();
  return {
    result: {
      adressLine1: " ",
      city: " ",
      contractId: null,
      country: "MAR",
      description: null,
      email: "yassine.elamrani@etu.ac.ma",
      numberOfChildren: null,
      phoneNumber: "212612345678",
      pidNUmber: null,
      pidType: "CIN",
      products: [
        {
          abbreviation: null,
          contractId: MOCK_CONTRACT_ID,
          description: null,
          email: "",
          level: "000",
          name: "CDP BASIC",
          phoneNumber: "212612345678",
          productTypeId: "000",
          productTypeName: "PARTICULIER",
          provider: "INWI",
          rib: "853780241716465970216211",
          solde: "2436.50",
          statusId: "1",
          tierType: "03",
          uid: "000"
        }
      ],
      radical: "",
      soldeCumule: "2436.50",
      statusId: null,
      tierFirstName: "Yassine",
      tierId: "TR2334600322963601",
      tierLastName: "El Amrani",
      userName: null,
      familyStatus: null
    }
  };
}

// ─── Wallet operations ──────────────────────────────────────
export async function mockGetWalletOperations(/* contractid */) {
  await delay(400);
  const now = new Date();

  // Helper to format date like "12/8/2023 5:59:39 PM"
  const fmtDate = (date) => {
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).replace(',', '');
  };

  return {
    result: [
      {
        amount: "12.50",
        beneficiaryFirstName: "Aura",
        beneficiaryLastName: "Save",
        clientNote: "Aura — Arrondi automatique",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 2 * 3600000)),
        referenceId: "AURA-RND-001",
        status: "000",
        totalAmount: "12.50",
        type: "DEBIT",
      },
      {
        amount: "50.00",
        beneficiaryFirstName: "Aura",
        beneficiaryLastName: "Save",
        clientNote: "Aura — Transfert automatique hebdomadaire",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 26 * 3600000)),
        referenceId: "AURA-WK-002",
        status: "000",
        totalAmount: "50.00",
        type: "DEBIT",
      },
      {
        amount: "1500.00",
        beneficiaryFirstName: "Bourse",
        beneficiaryLastName: "CNRST",
        clientNote: "Virement reçu — Bourse CNRST",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 3 * 86400000)),
        referenceId: "VIR-IN-003",
        status: "000",
        totalAmount: "1500.00",
        type: "CREDIT",
      },
      {
        amount: "187.30",
        beneficiaryFirstName: "Carrefour",
        beneficiaryLastName: "Market",
        clientNote: "Paiement",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 4 * 86400000)),
        referenceId: "PAY-004",
        status: "000",
        totalAmount: "187.30",
        type: "DEBIT",
      },
      {
        amount: "7.70",
        beneficiaryFirstName: "Aura",
        beneficiaryLastName: "Save",
        clientNote: "Aura — Arrondi automatique",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 4 * 86400000 - 3600000)),
        referenceId: "AURA-RND-005",
        status: "000",
        totalAmount: "7.70",
        type: "DEBIT",
      },
      {
        amount: "299.00",
        beneficiaryFirstName: "Jumia",
        beneficiaryLastName: "Maroc",
        clientNote: "Paiement",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 6 * 86400000)),
        referenceId: "PAY-006",
        status: "000",
        totalAmount: "299.00",
        type: "DEBIT",
      },
      {
        amount: "50.00",
        beneficiaryFirstName: "Aura",
        beneficiaryLastName: "Save",
        clientNote: "Aura — Transfert automatique hebdomadaire",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 8 * 86400000)),
        referenceId: "AURA-WK-007",
        status: "000",
        totalAmount: "50.00",
        type: "DEBIT",
      },
      {
        amount: "800.00",
        beneficiaryFirstName: "Famille",
        beneficiaryLastName: "",
        clientNote: "Virement reçu — Aide mensuelle",
        currency: "MAD",
        date: fmtDate(new Date(now.getTime() - 10 * 86400000)),
        referenceId: "VIR-IN-008",
        status: "000",
        totalAmount: "800.00",
        type: "CREDIT",
      },
    ],
  };
}

// ─── Wallet balance ─────────────────────────────────────────
export async function mockGetWalletBalance(/* contractid */) {
  await delay(300);
  return {
    result: {
      balance: [
        {
          value: "2436,50",
        },
      ],
    },
  };
}

// ─── Simulate bank transfer ─────────────────────────────────
export async function mockSimulateBankTransfer(payload) {
  await delay(500);
  const amount = payload?.Amount || "12";
  return {
    result: [
      {
        frais: "0",
        fraisSms: null,
        totalAmountWithFee: amount,
        deviseEmissionCode: null,
        fraisInclus: false,
        montantDroitTimbre: 0,
        montantFrais: 0,
        montantFraisSMS: 0,
        montantFraisTotal: 0,
        montantTVA: 0,
        montantTVASMS: 0,
        tauxChange: 0
      }
    ]
  };
}

// ─── Send OTP for transfer ──────────────────────────────────
export async function mockSendTransferOtp(/* payload */) {
  await delay(400);
  return {
    result: "123456"
  };
}

// ─── Confirm bank transfer ──────────────────────────────────
export async function mockConfirmBankTransfer(payload) {
  await delay(700);
  return {
    result: {
      contractId: payload?.ContractId || MOCK_CONTRACT_ID,
      reference: "709846211156"
    }
  };
}
