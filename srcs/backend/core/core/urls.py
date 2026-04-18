from django.contrib import admin
from django.urls import path, include

from wallet.urls import wallet_urlpatterns, merchant_urlpatterns
from wallet import views as wallet_views


urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    # ── Wallet Management KIT APIs ────────────────────────────
    # 4.1–4.10, 4.13: All /wallet/* endpoints
    path('api/wallet/', include(wallet_urlpatterns)),

    # 4.11.1: Merchant wallet pre-creation (POST /merchants)
    path('api/merchants', wallet_views.merchant_create, name='merchant-create'),

    # 4.11.2, 4.12, 4.14: All /merchant/* endpoints
    path('api/merchant/', include(merchant_urlpatterns)),
]
