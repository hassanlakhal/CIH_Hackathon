from django.contrib import admin
from .models import Wallet, Transaction


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'wallet_type', 'first_name', 'last_name', 'contract_id', 'balance', 'status', 'created_at')
    list_filter = ('wallet_type', 'status', 'provider')
    search_fields = ('phone_number', 'first_name', 'last_name', 'contract_id', 'token')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_type', 'amount', 'currency', 'status', 'reference_id', 'source_phone', 'destination_phone', 'created_at')
    list_filter = ('transaction_type', 'status', 'currency')
    search_fields = ('reference_id', 'token', 'source_phone', 'destination_phone', 'source_contract_id')
    readonly_fields = ('created_at', 'updated_at')
