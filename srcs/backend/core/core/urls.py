from django.urls import path, include

from wallet.urls import wallet_urlpatterns, merchant_urlpatterns
from wallet import views as wallet_views


urlpatterns = [
    path('api/wallet/',    include(wallet_urlpatterns)),
    path('api/merchant/',  include(merchant_urlpatterns)),
    path('api/merchants',  wallet_views.merchant_create, name='merchant-create'),
]
