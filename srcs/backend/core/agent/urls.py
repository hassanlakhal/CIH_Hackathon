"""
Agent URL Configuration — Smart Savings Calendar
=================================================
Mounts the following endpoints under the prefix configured in core/urls.py:

    POST  /api/agent/savings-calendar/   Smart Savings Calendar forecast
    GET   /api/agent/health/             Liveness check
"""

from django.urls import path
from . import views

app_name = "agent"

urlpatterns = [
    path("savings-calendar/", views.savings_calendar, name="savings-calendar"),
    path("health/",           views.agent_health,     name="agent-health"),
]
