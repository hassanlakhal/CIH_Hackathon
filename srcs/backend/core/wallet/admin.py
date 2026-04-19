from django.contrib import admin
from .models import (
    Wallet, Transaction, userSurvey,
    SavingsGoal, MonthlySavingRecord, AutoSavingRule, WalletInsight, FinancialHealthScore,
)


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


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ('title', 'wallet', 'target_amount', 'current_saved', 'target_date', 'priority', 'status', 'created_at')
    list_filter = ('status', 'priority')
    search_fields = ('title', 'wallet__phone_number')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MonthlySavingRecord)
class MonthlySavingRecordAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'month', 'income_total', 'expense_total', 'actual_saved', 'goal_contribution', 'data_source')
    list_filter = ('data_source', 'month')
    search_fields = ('wallet__phone_number',)
    readonly_fields = ('created_at',)


@admin.register(AutoSavingRule)
class AutoSavingRuleAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'rule_type', 'value', 'is_active', 'total_auto_saved', 'goal', 'created_at')
    list_filter = ('rule_type', 'is_active')
    search_fields = ('wallet__phone_number',)
    readonly_fields = ('created_at',)


@admin.register(WalletInsight)
class WalletInsightAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'month', 'health_score', 'savings_rate_pct', 'net_savings_last_month', 'goal_on_track', 'generated_at')
    list_filter = ('goal_on_track', 'month')
    search_fields = ('wallet__phone_number',)
    readonly_fields = ('generated_at',)


@admin.register(FinancialHealthScore)
class FinancialHealthScoreAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'month', 'score', 'label', 'savings_rate_score', 'goal_progress_score', 'stability_score')
    list_filter = ('label', 'month')
    search_fields = ('wallet__phone_number',)
    readonly_fields = ('created_at',)
