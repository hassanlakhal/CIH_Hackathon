from django.urls import path
from .views import checkHealth

urlpatterns = [
    path('ping', checkHealth),
]