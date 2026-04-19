"""
Wallet Management URL Configuration
=====================================
Maps all Wallet Management KIT API endpoints to their views.

Wallet endpoints are mounted at:   api/wallet/
Merchant endpoints are mounted at: api/merchant/ and api/merchants
"""

from django.urls import path
from . import views


# ── Wallet URLs (included under 'api/wallet/') ───────────────────────

wallet_urlpatterns = [
    # 4.1 - Wallet creation (precreate / activate via ?state= query param)
    path('', views.wallet_create, name='wallet-create'),

    # 4.2 - Client info consultation
    path('clientinfo', views.client_info, name='client-info'),

    # 4.3 - Transaction history
    path('operations', views.operations_history, name='operations-history'),

    # 4.4 - Balance consultation
    path('balance', views.wallet_balance, name='wallet-balance'),

    # 4.5 - Cash IN (simulation / confirmation via ?step= query param)
    path('cash/in', views.cash_in, name='cash-in'),

    # 4.6 - Cash OUT
    path('cash/out', views.cash_out, name='cash-out'),

    # 4.7 - Wallet to Wallet
    path('transfer/wallet', views.wallet_to_wallet, name='w2w'),

    # 4.8 - Transfer / Virement
    path('transfer/virement', views.transfer_virement, name='transfer-virement'),

    # 4.9 - ATM Withdrawal
    path('cash/gab/out', views.atm_withdrawal, name='atm-withdrawal'),

    # 4.10 - Wallet to Merchant
    path('Transfer/WalletToMerchant', views.wallet_to_merchant, name='w2m'),
    path('checker', views.checkcheck),
    # 4.13 - Dynamic QR Code
    path('pro/qrcode/dynamic', views.dynamic_qr_code, name='qr-code'),

    # 4.15 - User Survey
    path('survey', views.survey_view, name='survey-view'),

    # 4.16 - Savings Goals
    path('goals', views.savings_goal_list_create, name='goal-list-create'),
    path('goals/<int:pk>', views.savings_goal_detail, name='goal-detail'),

    # 4.17 - AutoSave Rules
    path('auto-save', views.auto_saving_rule_create, name='auto-save-create'),

    # 4.18 - AI Insights
    path('insight', views.wallet_insight_trigger, name='wallet-insight'),

    # 4.19 - Health History
    path('health', views.health_score_history, name='health-history'),
]


# ── Merchant URLs (included under 'api/merchant/') ───────────────────

merchant_urlpatterns = [
    # 4.11.2 - Merchant activation
    path('activate', views.merchant_activate, name='merchant-activate'),

    # 4.12 - Merchant to Merchant
    path('transaction/simulation', views.m2m_simulation, name='m2m-simulation'),
    path('transaction/confirmation', views.m2m_confirmation, name='m2m-confirmation'),

    # 4.14 - Merchant to Wallet
    path('merchantToWallet/simulation', views.m2w_simulation, name='m2w-simulation'),
    path('merchantToWallet/confirmation', views.m2w_confirmation, name='m2w-confirmation'),
]
